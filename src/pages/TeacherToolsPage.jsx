import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Users, BarChart2, ArrowRight } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getNotices, addNotice, updateNotice, deleteNotice } from '../services/noticeService';
import { getAllUsers } from '../services/adminService';
import { getAttendance } from '../auth/authService';
import { getClosedDays } from '../services/calendarOverrideService';
import { calcAttendance } from '../data/attendanceUtils';
import { notifyClassSafe } from '../services/notify';

// ── Notice Tool ───────────────────────────────────────────────
function NoticeTool({ currentUser }) {
  const [notices, setNotices]     = useState([]);
  const [body, setBody]           = useState('');
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy]           = useState(false);

  useEffect(() => { getNotices().then(setNotices).catch(() => {}); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      if (editingId) {
        await updateNotice(editingId, { body });
      } else {
        await addNotice({ body, authorName: currentUser.name, authorPhone: currentUser.id });
        const preview = body.trim().replace(/[#*_>`-]/g, '').replace(/\s+/g, ' ').slice(0, 120);
        notifyClassSafe(currentUser, { title: '📢 New Notice', body: preview, url: '/', type: 'notice' });
      }
      setBody(''); setEditingId(null);
      setNotices(await getNotices());
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setBusy(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this notice?')) return;
    await deleteNotice(id).catch(() => {});
    setNotices(n => n.filter(x => x.id !== id));
  }

  return (
    <div className="glass-card">
      <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Megaphone size={20} color="var(--primary)" /> Send / Manage Notices
      </h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Type a notice…"
          rows={3}
          required
          style={{
            padding: '0.75rem', background: 'var(--background)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)', resize: 'vertical', fontSize: '0.9rem',
          }}
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="auth-btn primary" type="submit" disabled={busy} style={{ flex: 1, padding: '0.5rem' }}>
            {busy ? 'Posting…' : editingId ? 'Update Notice' : 'Post Notice'}
          </button>
          {editingId && (
            <button type="button" className="auth-btn secondary" onClick={() => { setEditingId(null); setBody(''); }} style={{ padding: '0.5rem 1rem' }}>
              Cancel
            </button>
          )}
        </div>
      </form>
      {notices.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {notices.map(n => (
            <div key={n.id} style={{
              padding: '0.6rem 0.8rem', background: 'var(--surface-hover)',
              borderRadius: 'var(--radius-sm)', fontSize: '0.85rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem',
            }}>
              <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {n.body?.slice(0, 100)}
              </span>
              <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                <button className="auth-link" style={{ fontSize: '0.78rem' }} onClick={() => { setEditingId(n.id); setBody(n.body); }}>Edit</button>
                <button className="auth-link" style={{ fontSize: '0.78rem', color: '#ef4444' }} onClick={() => handleDelete(n.id)}>Del</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function TeacherToolsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [classAvgAtt, setClassAvgAtt] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([getAllUsers(), getClosedDays()])
      .then(async ([users, closed]) => {
        if (!active) return;
        const students = users.filter(u => u.rollNo && u.rollNo > 0 && u.phone);
        if (!students.length) return;
        const attendances = await Promise.all(
          students.map(u => getAttendance(u.phone).catch(() => []))
        );
        const pcts = attendances.map(absent =>
          calcAttendance(absent, undefined, closed).monthlyAveragePercentage
        );
        const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
        if (active) setClassAvgAtt(avg);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!currentUser) return null;

  return (
    <div className="dashboard animate-fade-in fade-in-up">
      <header className="dash-greeting">
        <h1>🛠 <span className="text-gradient">Teacher Tools</span></h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.3rem', fontSize: '0.9rem' }}>
          Manage notices, view class stats, and access dashboards.
        </p>
      </header>

      {/* Stats row */}
      <div className="dash-stats-row">
        <div className="glass-card dash-stat glow-hover">
          <span className="dash-stat-label"><Users size={16} /> Class Avg Attendance</span>
          <span className={`dash-stat-value ${classAvgAtt !== null ? (classAvgAtt >= 75 ? 'att-pct-good' : classAvgAtt >= 60 ? 'att-pct-warn' : 'att-pct-bad') : ''}`}>
            {classAvgAtt !== null ? `${classAvgAtt}%` : '…'}
          </span>
          <span className="dash-stat-sub">monthly average across all students</span>
        </div>
        <div className="glass-card dash-stat glow-hover" style={{ cursor: 'pointer' }} onClick={() => navigate('/maths')}>
          <span className="dash-stat-label"><BarChart2 size={16} /> Maths Dashboard</span>
          <span className="dash-stat-value" style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>View Scores</span>
          <span className="dash-stat-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            Test 1 &amp; Test 2 <ArrowRight size={12} />
          </span>
        </div>
      </div>

      {/* Notices tool — always expanded on the dedicated page */}
      <NoticeTool currentUser={currentUser} />
    </div>
  );
}
