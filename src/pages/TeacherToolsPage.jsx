import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStarBatchRouteGuard } from '../auth/starBatchAccess';
import { Megaphone, Users, BarChart2, ArrowRight, Bold, Italic, List, Save, Pencil, Trash2, X, BookMarked, ClipboardList } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import FormatToolbar from '../components/FormatToolbar';
import NoticeText from '../components/NoticeText';
import CopyWhatsAppButton from '../components/CopyWhatsAppButton';
import { stripFormatting } from '../utils/whatsappFormat';
import { getNotices, addNotice, updateNotice, deleteNotice } from '../services/noticeService';
import { getAllUsers } from '../services/adminService';
import { getAttendance } from '../auth/authService';
import { getClosedDays } from '../services/calendarOverrideService';
import { calcAttendance } from '../data/attendanceUtils';
import { notifyClassSafe } from '../services/notify';
import MarksManager from '../components/MarksManager';
import TeacherSyllabusView from '../components/TeacherSyllabusView';

// ── Notice Tool ───────────────────────────────────────────────
function NoticeTool({ currentUser }) {
  const [notices, setNotices]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [body, setBody]           = useState('');
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy]           = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const textareaRef               = useRef(null);

  useEffect(() => {
    let active = true;
    getNotices()
      .then(d => { if (active) setNotices(d); })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  const refresh = useCallback(() => { setLoading(true); setReloadKey(k => k + 1); }, []);


  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      if (editingId) {
        await updateNotice(editingId, { body });
      } else {
        await addNotice({ body, authorName: currentUser.name, authorPhone: currentUser.id });
        const preview = stripFormatting(body, 120);
        notifyClassSafe(currentUser, { title: '📢 New Notice', body: preview, url: '/', type: 'notice' });
      }
      setBody(''); setEditingId(null); refresh();
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setBusy(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this notice?')) return;
    try { await deleteNotice(id); refresh(); } catch (err) { alert('Failed: ' + err.message); }
  }

  // Teacher can only edit/delete their own notices
  const myNotices = notices.filter(n => n.authorPhone === currentUser.id);

  return (
    <div className="glass-card">
      <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Megaphone size={20} color="var(--primary)" />
        {editingId ? 'Edit Notice' : 'Post a Notice'}
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <FormatToolbar textareaRef={textareaRef} body={body} setBody={setBody} />
        <textarea
          ref={textareaRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write your notice… Use the toolbar for *bold*, _italic_, lists and more (WhatsApp style)."
          rows={5}
          required
          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
        />
        {body.trim() && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Preview</span>
            <div style={{ marginTop: '0.5rem' }}><NoticeText>{body}</NoticeText></div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" disabled={busy} className="auth-btn primary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <Save size={16} /> {busy ? 'Saving…' : editingId ? 'Update Notice' : 'Post Notice'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setBody(''); }} className="auth-btn secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <X size={16} /> Cancel
            </button>
          )}
        </div>
      </form>

      {/* Only show teacher's own notices for management */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Your Notices {myNotices.length > 0 && `(${myNotices.length})`}
        </h3>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : myNotices.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No notices posted yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {myNotices.map(n => (
              <div key={n.id} className="notice-item">
                <NoticeText>{n.body}</NoticeText>
                <div className="notice-item-meta">
                  <span>— {n.authorName}</span>
                  <span style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => { setEditingId(n.id); setBody(n.body); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      title="Edit" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(n.id)}
                      title="Delete" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}>
                      <Trash2 size={15} />
                    </button>
                  </span>
                </div>
                <CopyWhatsAppButton body={n.body} shareLink={`${window.location.origin}/api/notice-share?id=${n.id}`} style={{ marginTop: '0.5rem' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function TeacherToolsPage() {
  useStarBatchRouteGuard();
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
          calcAttendance(absent, undefined, closed).percentage
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

      {/* Marks module — only for teachers granted access by admin */}
      {currentUser.canManageMarks && <MarksManager currentUser={currentUser} />}

      {/* Syllabus module — only for teachers with at least one subject granted */}
      {(currentUser.syllabusSubjects?.length > 0) && (
        <div className="glass-card">
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <BookMarked size={20} color="var(--primary)" /> Syllabus Manager
          </h2>
          <TeacherSyllabusView syllabusSubjects={currentUser.syllabusSubjects} />
        </div>
      )}

      {/* Records module — only for teachers with at least one table granted */}
      {(currentUser.recordTables?.length > 0) && (
        <div className="glass-card glow-hover" style={{ cursor: 'pointer' }} onClick={() => navigate('/teacher-records')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600, fontSize: '0.95rem' }}>
              <ClipboardList size={18} color="var(--primary)" /> Records
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                {currentUser.recordTables.length} table{currentUser.recordTables.length !== 1 ? 's' : ''} assigned
              </span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.82rem', flexShrink: 0 }}>
              Edit &amp; update <ArrowRight size={13} />
            </span>
          </div>
        </div>
      )}

      {/* Notices tool — always expanded on the dedicated page */}
      <NoticeTool currentUser={currentUser} />
    </div>
  );
}
