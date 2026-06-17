import { Calendar, Lock, Loader2, Copy, Check } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useEffect, useState } from 'react';
import { getHomework } from '../services/homeworkService';

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
    const text = formatForWhatsApp(day);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.4rem',
        background: copied ? 'rgba(16,185,129,0.12)' : 'var(--surface-hover)',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
        color: copied ? '#6ee7b7' : 'var(--text-secondary)',
        padding: '0.4rem 0.85rem',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        fontSize: '0.82rem',
        fontWeight: 600,
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy for WhatsApp</>}
    </button>
  );
}

export default function Homework() {
  const { currentUser, openModal } = useAuth();
  const [homeworkList, setHomeworkList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      getHomework()
        .then((data) => setHomeworkList(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="animate-fade-in fade-in-up" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <Lock size={48} color="var(--tertiary)" style={{ margin: '0 auto 1rem auto' }} />
        <h1 className="page-title text-gradient">Locked Portal</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          You must be logged in to access the Homework portal.
        </p>
        <button className="auth-btn primary" onClick={openModal} style={{ margin: '0 auto' }}>
          Login / Register
        </button>
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
      ) : (
        <div className="task-list">
          {homeworkList.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '2rem' }}>No homework available.</p>
          ) : (
            homeworkList.map((day) => (
              <div key={day.id} className="glass-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h2 className="section-title text-gradient" style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={20} className="text-primary" />
                    {day.date?.replace(/_/g, '').replace(/Date:/i, '').trim()}
                  </h2>
                  <CopyButton day={day} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {(!day.tasks || day.tasks.length === 0) ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No homework details found.</p>
                  ) : day.tasks.map((task, idx) => (
                    <div key={idx} style={{
                      padding: '0.9rem 1.1rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '4px solid var(--primary)',
                    }}>
                      <h3 style={{ fontSize: '1rem', marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                        {task.subject}
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                        {task.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
