import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getInAppNotices, markInAppNoticeSeen } from '../services/inAppNoticeService';
import { Megaphone, Check, X, ShieldAlert } from 'lucide-react';

export default function InAppPushManager() {
  const { currentUser } = useAuth();
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    
    // Wait 5 seconds after login to show push notices
    const timer = setTimeout(() => {
      getInAppNotices().then(notices => {
        const seen = currentUser.seenInAppNotices || [];
        const unseen = notices.filter(n => !seen.includes(n.id));
        if (unseen.length > 0) {
          setQueue(unseen);
          setCurrentIndex(0);
          setVisible(true);
        }
      }).catch(console.error);
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentUser]);

  if (!visible || queue.length === 0 || currentIndex >= queue.length) return null;

  const currentNotice = queue[currentIndex];
  const isMandatory = currentNotice.isMandatory;
  const isLast = currentIndex === queue.length - 1;

  async function handleDismiss() {
    setVisible(false); // smoothly fade out first
    
    // Mark as seen in Firestore
    try {
      await markInAppNoticeSeen(currentUser.phone, currentNotice.id);
    } catch (e) {
      console.error(e);
    }

    // After animation delay, move to next
    setTimeout(() => {
      if (!isLast) {
        setCurrentIndex(i => i + 1);
        setVisible(true); // fade next one in
      }
    }, 300);
  }

  return (
    <div className={`complaint-overlay ${visible ? 'fade-in' : 'fade-out'}`}>
      <div className={`complaint-modal ${visible ? 'slide-up' : 'slide-down'}`} style={{ maxWidth: 440 }}>
        <div className="complaint-glow" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: isMandatory ? 'rgba(239, 68, 68, 0.12)' : 'rgba(139,92,246,0.12)', border: `1px solid ${isMandatory ? 'rgba(239, 68, 68, 0.25)' : 'rgba(139,92,246,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isMandatory ? '#ef4444' : 'var(--primary)', flexShrink: 0 }}>
              {isMandatory ? <ShieldAlert size={20} /> : <Megaphone size={20} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {currentNotice.title}
              </h2>
              {queue.length > 1 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Notice {currentIndex + 1} of {queue.length}
                </span>
              )}
            </div>
          </div>

          <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem', whiteSpace: 'pre-wrap' }}>
            {currentNotice.body}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexDirection: isMandatory ? 'column' : 'row' }}>
            {isMandatory ? (
              <button className="complaint-submit-btn" onClick={handleDismiss} style={{ width: '100%', background: '#ef4444', boxShadow: '0 8px 24px -8px rgba(239, 68, 68, 0.5)' }}>
                <Check size={16} /> I Understand
              </button>
            ) : (
              <>
                <button className="complaint-submit-btn" onClick={handleDismiss} style={{ flex: 1 }}>
                  <Check size={16} /> Acknowledge
                </button>
                <button
                  onClick={handleDismiss}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', padding: '0 1rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem', transition: 'border-color 0.2s, color 0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}
                  onMouseEnter={e => { e.target.style.borderColor = 'var(--text-muted)'; e.target.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-muted)'; }}
                >
                  <X size={14} /> Skip
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
