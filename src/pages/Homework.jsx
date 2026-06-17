import { Calendar, Lock, Loader2, Copy, Check } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { getHomework } from '../services/homeworkService';
import { getHomeworkDone, setHomeworkDone } from '../auth/authService';

function formatForWhatsApp(day) {
  const date = day.date?.trim() || '';
  const tasks = day.tasks || [];
  const taskLines = tasks.map((t, i) =>
    `*${i + 1}. ${t.subject}*\n${t.description.trim()}`
  ).join('\n\n');
  return `📚 *Homework — ${date}*\n\n${taskLines}\n\n> _Shared via 10th HI Portal_`;
}

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
    }}>
      {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy for WhatsApp</>}
    </button>
  );
}

export default function Homework() {
  const { currentUser, openModal } = useAuth();
  const [homeworkList, setHomeworkList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doneKeys, setDoneKeys] = useState(new Set());

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

      {loading ? (
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
              <div key={day.id} className="glass-card" style={{ marginBottom: '1.5rem', opacity: allDone ? 0.75 : 1, transition: 'opacity 0.3s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h2 className="section-title text-gradient" style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={20} className="text-primary" />
                      {day.date?.replace(/_/g, '').replace(/Date:/i, '').trim()}
                    </h2>
                    {dayTotal > 0 && (
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px',
                        borderRadius: '99px',
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
                      <button
                        key={idx}
                        onClick={() => toggleTask(key)}
                        style={{
                          width: '100%', textAlign: 'left', background: 'none', border: 'none',
                          padding: 0, cursor: 'pointer',
                        }}
                      >
                        <div style={{
                          padding: '0.9rem 1.1rem',
                          background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                          borderRadius: 'var(--radius-md)',
                          borderLeft: `4px solid ${done ? '#10b981' : 'var(--primary)'}`,
                          display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                          transition: 'all 0.2s',
                        }}>
                          {/* Checkbox */}
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
                              transition: 'all 0.2s',
                            }}>
                              {task.subject}
                            </p>
                            <p style={{
                              color: 'var(--text-secondary)', fontSize: '0.88rem',
                              lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0,
                              opacity: done ? 0.6 : 1,
                            }}>
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
      )}
    </div>
  );
}
