import { Calendar, Lock, Loader2, Copy, Check, BookOpen, ClipboardList } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getHomework } from '../services/homeworkService';
import { getAllClasswork } from '../services/classworkService';
import { getHomeworkDone, setHomeworkDone } from '../auth/authService';
import { toDateKey } from '../data/attendanceUtils';

// ── Subject → emoji map ────────────────────────────────────────
const SUBJECT_EMOJI = {
  hindi: '📙', math: '🧮', maths: '🧮', mathematics: '🧮',
  english: '📗', science: '🔬', physics: '⚡', chemistry: '🧪',
  biology: '🌿', history: '🏛️', geography: '🌍', civics: '⚖️',
  economics: '📊', it: '💻', computer: '💻', sst: '🗺️',
  sanskrit: '🕉️', social: '🗺️', 'social science': '🗺️',
  general: '📌',
};

function subjectEmoji(subject) {
  const key = subject.toLowerCase().trim();
  for (const [k, v] of Object.entries(SUBJECT_EMOJI)) {
    if (key.includes(k)) return v;
  }
  return '📌';
}

// ── WhatsApp format ────────────────────────────────────────────
function formatForWhatsApp(day) {
  const date = day.date?.trim() || '';
  const tasks = day.tasks || [];
  const link = `${window.location.origin}/share/homework/${homeworkDateParam(day)}`;

  const taskLines = tasks.map((t) =>
    `*${subjectEmoji(t.subject)} ${t.subject.toUpperCase().trim()}*\n> ${t.description.trim().replace(/\n/g, '\n> ')}`
  ).join('\n\n');

  return `📋 *T O D A Y ' S   T A S K S* 📋\n_Date: ${date}_\n━━━━━━━ ✦ ━━━━━━━\n\n${taskLines}\n\n━━━━━━━ ✦ ━━━━━━━\n🔗 ${link}`;
}

function homeworkDateParam(day) {
  if (!day?.date) return '';
  const d = new Date(day.date);
  if (isNaN(d)) return '';
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

// ── CopyButton ─────────────────────────────────────────────────
function CopyButton({ day }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(formatForWhatsApp(day));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handleCopy} style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      background: copied ? 'rgba(16,185,129,0.12)' : 'var(--surface-hover)',
      border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
      color: copied ? '#6ee7b7' : 'var(--text-secondary)',
      padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)',
      cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s',
      whiteSpace: 'nowrap',
    }}>
      {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy for WhatsApp</>}
    </button>
  );
}

// ── Classwork WhatsApp format + deep link ──────────────────────
function formatClassworkForWhatsApp(day) {
  const dateStr = new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const link = `${window.location.origin}/share/classwork/${day.date}`;
  const periods = day.periods || [];

  const lines = periods.map((p) =>
    `*${subjectEmoji(p.subject)} ${p.period} · ${p.subject.toUpperCase().trim()}*\n> ${(p.note || '').trim().replace(/\n/g, '\n> ')}`
  ).join('\n\n');

  return `📝 *C L A S S W O R K* 📝\n_${dateStr}_\n━━━━━━━ ✦ ━━━━━━━\n\n${lines}\n\n━━━━━━━ ✦ ━━━━━━━\n🔗 ${link}`;
}

function ClassworkCopyButton({ day }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(formatClassworkForWhatsApp(day));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handleCopy} style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      background: copied ? 'rgba(16,185,129,0.12)' : 'var(--surface-hover)',
      border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
      color: copied ? '#6ee7b7' : 'var(--text-secondary)',
      padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)',
      cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s',
      whiteSpace: 'nowrap',
    }}>
      {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy for WhatsApp</>}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function Homework() {
  const { currentUser, openModal } = useAuth();
  const [homeworkList, setHomeworkList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doneKeys, setDoneKeys] = useState(new Set());
  const [searchParams, setSearchParams] = useSearchParams();
  const dayRefs = useRef({});
  const cwRefs = useRef({});

  // Tabs: 'homework' | 'classwork'
  const [tab, setTab] = useState(searchParams.get('tab') === 'classwork' ? 'classwork' : 'homework');
  const [classworkList, setClassworkList] = useState(null); // null = not loaded yet

  // Load classwork lazily the first time the Classwork tab is opened.
  useEffect(() => {
    if (tab !== 'classwork' || classworkList !== null || !currentUser) return;
    getAllClasswork()
      .then(setClassworkList)
      .catch((err) => { console.error(err); setClassworkList([]); });
  }, [tab, classworkList, currentUser]);

  function selectTab(next) {
    setTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'classwork') params.set('tab', 'classwork');
    else params.delete('tab');
    setSearchParams(params, { replace: true });
  }

  useEffect(() => {
    if (!currentUser) return;
    getHomework()
      .then(setHomeworkList)
      .catch(console.error)
      .finally(() => setLoading(false));
    getHomeworkDone(currentUser.phone)
      .then((keys) => setDoneKeys(new Set(keys)))
      .catch(console.error);
  }, [currentUser]);

  // Auto-scroll to ?date= param and set page title
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (!dateParam || homeworkList.length === 0) return;

    const match = homeworkList.find((hw) => homeworkDateParam(hw) === dateParam);
    if (!match) return;

    // Set OG-style page title for link preview
    document.title = `Homework – ${match.date} | IX HF Portal`;

    // Scroll to the card
    const ref = dayRefs.current[match.id];
    if (ref) setTimeout(() => ref.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);

    return () => { document.title = 'X HI Portal'; };
  }, [searchParams, homeworkList]);

  // Auto-scroll to ?date= within the Classwork tab + set page title.
  useEffect(() => {
    if (tab !== 'classwork') return;
    const dateParam = searchParams.get('date');
    if (!dateParam || !classworkList || classworkList.length === 0) return;

    const match = classworkList.find((cw) => cw.date === dateParam);
    if (!match) return;

    document.title = `Classwork – ${match.weekday} | IX HF Portal`;
    const ref = cwRefs.current[match.id];
    if (ref) setTimeout(() => ref.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);

    return () => { document.title = 'X HI Portal'; };
  }, [searchParams, classworkList, tab]);

  const toggleTask = useCallback((taskKey) => {
    if (!currentUser) return;
    setDoneKeys((prev) => {
      const next = new Set(prev);
      next.has(taskKey) ? next.delete(taskKey) : next.add(taskKey);
      setHomeworkDone(currentUser.phone, Array.from(next)).catch(console.error);
      return next;
    });
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="animate-fade-in fade-in-up" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <Lock size={48} color="var(--tertiary)" style={{ margin: '0 auto 1rem auto' }} />
        <h1 className="page-title text-gradient">Locked Portal</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          You must be logged in to access the Homework portal.
        </p>
        <button className="auth-btn primary" onClick={openModal} style={{ margin: '0 auto' }}>Login / Register</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in fade-in-up">
      <h1 className="page-title text-gradient">Homework</h1>

      {/* Tabs */}
      <div className="hw-tabs">
        <button
          className={`hw-tab ${tab === 'homework' ? 'active' : ''}`}
          onClick={() => selectTab('homework')}
        >
          <BookOpen size={16} /> Homework
        </button>
        <button
          className={`hw-tab ${tab === 'classwork' ? 'active' : ''}`}
          onClick={() => selectTab('classwork')}
        >
          <ClipboardList size={16} /> Classwork
        </button>
      </div>

      {tab === 'homework' ? (
        loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : homeworkList.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>No homework available.</p>
        ) : (
          <div className="task-list">
            {homeworkList.map((day) => {
            const dayDone = (day.tasks || []).filter((_, i) => doneKeys.has(`${day.id}_${i}`)).length;
            const dayTotal = (day.tasks || []).length;
            const allDone = dayTotal > 0 && dayDone === dayTotal;

            return (
              <div
                key={day.id}
                ref={(el) => { dayRefs.current[day.id] = el; }}
                className="glass-card"
                style={{ marginBottom: '1.5rem', opacity: allDone ? 0.75 : 1, transition: 'opacity 0.3s', scrollMarginTop: '1rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h2 className="section-title text-gradient" style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={20} className="text-primary" />
                      {day.date?.replace(/_/g, '').replace(/Date:/i, '').trim()}
                    </h2>
                    {dayTotal > 0 && (
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
                        background: allDone ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.12)',
                        color: allDone ? '#6ee7b7' : 'var(--text-secondary)',
                        border: `1px solid ${allDone ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                      }}>
                        {allDone ? '✓ All done' : `${dayDone}/${dayTotal}`}
                      </span>
                    )}
                  </div>
                  <CopyButton day={day} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(!day.tasks || day.tasks.length === 0) ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No homework details found.</p>
                  ) : day.tasks.map((task, idx) => {
                    const key = `${day.id}_${idx}`;
                    const done = doneKeys.has(key);
                    return (
                      <button key={idx} onClick={() => toggleTask(key)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        <div style={{
                          padding: '0.9rem 1.1rem',
                          background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                          borderRadius: 'var(--radius-md)',
                          borderLeft: `4px solid ${done ? '#10b981' : 'var(--primary)'}`,
                          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                          transition: 'all 0.2s',
                        }}>
                          <div style={{
                            flexShrink: 0, marginTop: 2,
                            width: 20, height: 20, borderRadius: 6,
                            border: `2px solid ${done ? '#10b981' : 'var(--border)'}`,
                            background: done ? '#10b981' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}>
                            {done && <Check size={13} color="#fff" strokeWidth={3} />}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{
                              fontSize: '1rem', fontWeight: 600, marginBottom: '0.35rem',
                              color: done ? 'var(--text-secondary)' : 'var(--text-primary)',
                              textDecoration: done ? 'line-through' : 'none',
                              display: 'flex', alignItems: 'center', gap: '0.4rem',
                            }}>
                              <span>{subjectEmoji(task.subject)}</span> {task.subject}
                            </p>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0, opacity: done ? 0.6 : 1 }}>
                              {task.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        )
      ) : (
        /* ── Classwork tab ── */
        classworkList === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : classworkList.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>No classwork recorded yet.</p>
        ) : (
          <div className="task-list">
            {classworkList.map((day) => (
              <div
                key={day.id}
                ref={(el) => { cwRefs.current[day.id] = el; }}
                className="glass-card"
                style={{ marginBottom: '1.5rem', scrollMarginTop: '1rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h2 className="section-title text-gradient" style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={20} className="text-primary" />
                      {day.weekday}, {new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </h2>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
                      background: 'rgba(255,109,0,0.12)', color: '#fb923c',
                      border: '1px solid rgba(255,109,0,0.3)',
                    }}>
                      {day.periods?.length || 0} period{(day.periods?.length || 0) === 1 ? '' : 's'}
                    </span>
                  </div>
                  <ClassworkCopyButton day={day} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(!day.periods || day.periods.length === 0) ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No classwork details.</p>
                  ) : day.periods.map((p, idx) => (
                    <div key={idx} style={{
                      padding: '0.9rem 1.1rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '4px solid #FF6D00',
                    }}>
                      <p style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF6D00' }}>{p.period}</span>
                        <span>{subjectEmoji(p.subject)}</span> {p.subject}
                      </p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                        {p.note}
                      </p>
                    </div>
                  ))}
                </div>

                {day.updatedBy && (
                  <p style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                    Recorded by {day.updatedBy}
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
