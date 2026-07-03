import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Pencil, Trash2, ArrowLeft, X, Save } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roles';
import { getNotices, deleteNotice, updateNotice } from '../services/noticeService';
import NoticeText from '../components/NoticeText';
import CopyWhatsAppButton from '../components/CopyWhatsAppButton';
import FormatToolbar from '../components/FormatToolbar';

export default function ManageNoticesPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [visibleCount, setVisibleCount] = useState(10);
  
  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!authLoading && (!currentUser || (currentUser.role !== ROLES.MONITOR && !currentUser.isAdmin))) {
      navigate('/');
    }
  }, [currentUser, authLoading, navigate]);

  useEffect(() => {
    let active = true;
    getNotices()
      .then((data) => { if (active) setNotices(data); })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  const refresh = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const visibleNotices = notices.slice(0, visibleCount);

  function startEdit(notice) {
    setEditingId(notice.id);
    setBody(notice.body);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setBody('');
  }

  async function handleUpdate(e) {
    e.preventDefault();
    if (!body.trim() || !editingId) return;
    setBusy(true);
    try {
      await updateNotice(editingId, { body });
      setBody('');
      setEditingId(null);
      refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update notice: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this notice for everyone? This cannot be undone.')) return;
    try {
      await deleteNotice(id);
      refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to delete: ' + err.message);
    }
  }

  if (authLoading || !currentUser) return null;

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
        <button onClick={() => navigate('/admin')} className="auth-btn secondary" style={{ padding: '0.5rem' }} title="Back to Panel">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title"><Megaphone size={20} /> Manage Notices</h1>
          <p className="page-subtitle">View, edit, or delete posted notices</p>
        </div>
      </div>

      {editingId && (
        <div className="glass-card" style={{ marginBottom: '2rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <Pencil size={20} /> Edit Notice
          </h2>
          <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <FormatToolbar textareaRef={textareaRef} body={body} setBody={setBody} />
            <textarea
              ref={textareaRef}
              placeholder="Edit your notice…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
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
              <button type="submit" disabled={busy} className="auth-btn primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={16} /> {busy ? 'Updating…' : 'Update Notice'}
              </button>
              <button type="button" onClick={cancelEdit} className="auth-btn secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <X size={16} /> Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="notice-empty">Loading notices…</p>
      ) : notices.length === 0 ? (
        <p className="notice-empty">No notices found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {visibleNotices.map((n) => (
            <div key={n.id} className="glass-card notice-item" style={{ opacity: editingId === n.id ? 0.5 : 1 }}>
              <NoticeText>{n.body}</NoticeText>
              <div className="notice-item-meta">
                <span>— {n.authorName}</span>
                <span style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => startEdit(n)} title="Edit" disabled={editingId === n.id} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}><Pencil size={15} /></button>
                  <button onClick={() => handleDelete(n.id)} title="Delete" disabled={editingId === n.id} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={15} /></button>
                </span>
              </div>
              <CopyWhatsAppButton body={n.body} shareLink={`${window.location.origin}/api/notice-share?id=${n.id}`} style={{ marginTop: '0.5rem' }} />
            </div>
          ))}
          
          {notices.length > visibleCount && (
            <button 
              onClick={() => setVisibleCount(c => c + 10)}
              className="auth-btn secondary"
              style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem' }}
            >
              Load older notices
            </button>
          )}
        </div>
      )}
    </div>
  );
}
