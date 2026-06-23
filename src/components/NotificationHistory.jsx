import { useEffect, useState } from 'react';
import { Bell, Megaphone, BookOpen, BookMarked, Loader2 } from 'lucide-react';
import { getNotificationHistory } from '../services/notificationHistoryService';

const TYPE_META = {
  notice:    { icon: Megaphone,  color: '#8b5cf6', label: 'Notice' },
  homework:  { icon: BookOpen,   color: '#3b82f6', label: 'Homework' },
  syllabus:  { icon: BookMarked, color: '#10b981', label: 'Syllabus' },
  broadcast: { icon: Bell,       color: '#ec4899', label: 'Broadcast' },
};

function relativeTime(ms) {
  if (!ms) return '';
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Chronological list of every notification the class has been sent.
 * Read-only; shown inside a collapsible section on the Profile page.
 */
export default function NotificationHistory({ limit, onViewAll }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let active = true;
    getNotificationHistory(50)
      .then((data) => { if (active) setItems(data); })
      .catch((err) => { console.error(err); if (active) setItems([]); });
    return () => { active = false; };
  }, []);

  if (items === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <Loader2 size={24} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
        No notifications have been sent yet.
      </p>
    );
  }

  const visible = limit ? items.slice(0, limit) : items;
  const hasMore = limit && items.length > limit;

  return (
    <div className="notif-history">
      {visible.map((n) => {
        const meta = TYPE_META[n.type] || TYPE_META.broadcast;
        const Icon = meta.icon;
        return (
          <div key={n.id} className="notif-history-item">
            <div className="notif-history-icon" style={{ background: `${meta.color}1f`, color: meta.color }}>
              <Icon size={16} />
            </div>
            <div className="notif-history-body">
              <div className="notif-history-top">
                <strong>{n.title}</strong>
                <span className="notif-history-time">{relativeTime(n.sentAt)}</span>
              </div>
              {n.body && <p className="notif-history-text">{n.body}</p>}
              <span className="notif-history-tag" style={{ color: meta.color }}>{meta.label}</span>
            </div>
          </div>
        );
      })}
      {hasMore && onViewAll && (
        <button className="notif-view-all-btn" onClick={onViewAll}>
          View all notifications →
        </button>
      )}
    </div>
  );
}
