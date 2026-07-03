import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import NoticeText from '../components/NoticeText';
import CopyWhatsAppButton from '../components/CopyWhatsAppButton';
import { getNotices } from '../services/noticeService';

function formatDate(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    getNotices()
      .then(setNotices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const visibleNotices = notices.slice(0, visibleCount);

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title"><Megaphone size={20} /> Notices</h1>
        <p className="page-subtitle">All announcements from your class</p>
      </div>

      {loading ? (
        <p className="notice-empty">Loading notices…</p>
      ) : notices.length === 0 ? (
        <p className="notice-empty">No notices right now. You're all caught up! 🎉</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {visibleNotices.map((n, i) => (
            <div key={n.id} className="glass-card notice-item" style={i === 0 ? { border: '1px solid var(--primary)', borderRadius: 'var(--radius)' } : {}}>
              {i === 0 && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.25rem', display: 'block' }}>
                  LATEST
                </span>
              )}
              <NoticeText>{n.body}</NoticeText>
              <div className="notice-item-meta">
                <span>— {n.authorName}</span>
                <span>{formatDate(n.createdAtMs)}{n.updatedAtMs && n.updatedAtMs !== n.createdAtMs ? ' (edited)' : ''}</span>
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
