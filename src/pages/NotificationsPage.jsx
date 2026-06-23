import { Bell } from 'lucide-react';
import NotificationHistory from '../components/NotificationHistory';

export default function NotificationsPage() {
  return (
    <div className="page-container" style={{ maxWidth: 600, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <Bell size={22} color="var(--primary)" /> Notifications
      </h2>
      <NotificationHistory />
    </div>
  );
}
