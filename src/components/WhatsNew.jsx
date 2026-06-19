import { useState } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { useAuth } from '../auth/AuthContext';
import { completeWhatsNew } from '../auth/authService';
import { ROLES } from '../auth/roles';
import {
  isPushSupportedSync, isIosNeedsInstall, permissionState, requestPermissionAndToken,
} from '../services/pushService';
import {
  Sparkles, BookMarked, ClipboardList, TrendingUp, Bell, Check, X, BellRing,
} from 'lucide-react';

const STORAGE_KEY = (phone) => `whatsnew_v1_${phone}`;

// Tour steps shown after the user taps "Take a tour".
// Centered cards (no element spotlight) — clearer than highlighting bits of
// the page, and there's nothing underneath to accidentally click.
const TOUR_STEPS = [
  {
    target: 'body',
    placement: 'center',
    title: 'Syllabus Tracking',
    icon: <BookMarked size={22} />,
    content: 'On your dashboard you\'ll find a Syllabus Progress bar. Open it to see how much of every subject the class has completed — and tick off what your own copy has covered, topic by topic.',
    disableBeacon: true,
  },
  {
    target: 'body',
    placement: 'center',
    title: 'New Attendance % (CBSE style)',
    icon: <TrendingUp size={22} />,
    content: 'Your attendance percentage is now the average of each month\'s attendance — the same way CBSE calculates it — so every month counts equally.',
  },
  {
    target: 'body',
    placement: 'center',
    title: 'Classwork Log',
    icon: <ClipboardList size={22} />,
    content: 'The Homework page now has a Classwork tab, and your dashboard shows the latest classwork — so you can see exactly what was done in each period, every day.',
  },
  {
    target: 'body',
    placement: 'center',
    title: 'Stay Notified',
    icon: <Bell size={22} />,
    content: 'Turn on notifications to get instant alerts for new notices, homework and classwork. You can view the full alert history any time from your profile. Enjoy the new features!',
  },
];

const WhatsNewTooltip = ({ index, step, backProps, closeProps, primaryProps, tooltipProps, isLastStep }) => (
  <div {...tooltipProps} className="custom-tooltip role-student spring-up">
    <div className="tooltip-header stagger-1">
      {step.icon && <span style={{ color: 'var(--primary)' }}>{step.icon}</span>}
      <h3 className="tooltip-title" style={{ background: 'linear-gradient(135deg, var(--primary), #a78bfa)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
        {step.title}
      </h3>
    </div>
    <div className="tooltip-body stagger-2">{step.content}</div>
    <div className="tooltip-footer stagger-3">
      {/* Progress dots */}
      <div className="tour-dots">
        {Array.from({ length: step.totalSteps }).map((_, i) => (
          <span key={i} className={`tour-dot ${i === index ? 'active' : ''}`} />
        ))}
      </div>
      <div className="tooltip-controls">
        {index > 0 && <button {...backProps} className="tooltip-btn secondary">Back</button>}
        <button {...primaryProps} className="tooltip-btn primary">
          {isLastStep ? 'Got it!' : `Next (${index + 1}/${step.totalSteps})`}
        </button>
      </div>
    </div>
    {!isLastStep && (
      <button {...closeProps} className="tour-skip-link">Skip tour</button>
    )}
  </div>
);

/**
 * One-time "What's New" announcement for the syllabus / classwork / CBSE
 * attendance update. Shows a welcome modal with the feature list, an
 * "enable notifications" prompt, and an optional guided tour.
 *
 * Shown once per user — gated on BOTH a Firestore flag (whatsNewSeen_v1, so
 * it follows the user across devices) and a localStorage flag (instant, even
 * before the flag round-trips). Marked complete when the user finishes/closes
 * the welcome modal OR finishes/skips the tour.
 *
 * Never collides with first-time onboarding: it waits until the original
 * onboarding is complete before appearing.
 */
export default function WhatsNew() {
  const { currentUser } = useAuth();
  const [dismissed, setDismissed] = useState(false); // closed/finished this session
  const [runTour, setRunTour] = useState(false);
  const [steps, setSteps] = useState([]);
  const [notifState, setNotifState] = useState('idle'); // idle | working | done | unavailable

  function markComplete() {
    if (!currentUser) return;
    localStorage.setItem(STORAGE_KEY(currentUser.phone), '1');
    completeWhatsNew(currentUser.phone).catch(console.error);
  }

  function closeAll() {
    setDismissed(true);
    setRunTour(false);
    markComplete();
  }

  function startTour() {
    setSteps(TOUR_STEPS.map((s) => ({ ...s, totalSteps: TOUR_STEPS.length })));
    setDismissed(true); // hide the modal; the tour takes over
    setRunTour(true);
  }

  async function handleEnableNotifications() {
    if (!isPushSupportedSync() || isIosNeedsInstall()) {
      setNotifState('unavailable');
      return;
    }
    setNotifState('working');
    try {
      const token = await requestPermissionAndToken(currentUser);
      setNotifState(token ? 'done' : 'unavailable');
    } catch {
      setNotifState('unavailable');
    }
  }

  function handleTourCallback(data) {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
      markComplete();
    }
  }

  if (!currentUser) return null;

  // Whether to show the welcome modal is fully derivable — no effect needed.
  // Wait until first-time onboarding is finished so we don't stack modals.
  // Admins never run the original onboarding, so treat them as already done.
  const isAdmin = currentUser.isAdmin || currentUser.role === ROLES.ADMIN;
  const onboardingDone = isAdmin ||
    currentUser.onboardingCompleted ||
    localStorage.getItem(`onboarding_done_${currentUser.phone}`);
  const seen = currentUser.whatsNewSeen_v1 || localStorage.getItem(STORAGE_KEY(currentUser.phone));
  const showModal = !dismissed && !runTour && !!onboardingDone && !seen;

  const notifAlreadyOn = permissionState() === 'granted';

  return (
    <>
      {/* Welcome modal */}
      {showModal && (
        <div className="whatsnew-overlay" onClick={closeAll}>
          <div className="whatsnew-modal spring-up" onClick={(e) => e.stopPropagation()}>
            <button className="whatsnew-close" onClick={closeAll} aria-label="Close"><X size={18} /></button>

            <div className="whatsnew-badge"><Sparkles size={26} /></div>
            <h2 className="whatsnew-title">Welcome to <span className="text-gradient">X HI Portal</span></h2>
            <p className="whatsnew-sub">We've added some powerful new features — here's what's new:</p>

            <div className="whatsnew-features">
              <div className="whatsnew-feature">
                <span className="whatsnew-feature-icon" style={{ background: 'rgba(139,92,246,0.14)', color: '#8b5cf6' }}><BookMarked size={18} /></span>
                <div>
                  <strong>Syllabus Tracking</strong>
                  <span>See how much of each subject is done and tick off your own progress.</span>
                </div>
              </div>
              <div className="whatsnew-feature">
                <span className="whatsnew-feature-icon" style={{ background: 'rgba(255,109,0,0.14)', color: '#FF6D00' }}><ClipboardList size={18} /></span>
                <div>
                  <strong>Classwork Log</strong>
                  <span>Check what was taught in every period, every day.</span>
                </div>
              </div>
              <div className="whatsnew-feature">
                <span className="whatsnew-feature-icon" style={{ background: 'rgba(16,185,129,0.14)', color: '#10b981' }}><TrendingUp size={18} /></span>
                <div>
                  <strong>New Attendance % (CBSE style)</strong>
                  <span>Now calculated as the average of each month's attendance.</span>
                </div>
              </div>
            </div>

            {/* Enable notifications */}
            {!notifAlreadyOn && notifState !== 'done' && (
              <button className="whatsnew-notif-btn" onClick={handleEnableNotifications} disabled={notifState === 'working'}>
                <BellRing size={16} />
                {notifState === 'working' ? 'Enabling…'
                  : notifState === 'unavailable' ? 'Notifications unavailable on this device'
                  : 'Enable notifications to stay updated'}
              </button>
            )}
            {(notifAlreadyOn || notifState === 'done') && (
              <p className="whatsnew-notif-on"><Check size={15} /> Notifications are on — you're all set!</p>
            )}

            <div className="whatsnew-actions">
              <button className="auth-btn secondary" onClick={closeAll}>Maybe later</button>
              <button className="auth-btn primary" onClick={startTour}>Take a tour</button>
            </div>
          </div>
        </div>
      )}

      {/* Guided tour */}
      <Joyride
        steps={steps}
        run={runTour}
        continuous
        showSkipButton
        scrollToFirstStep
        disableScrollParentFix
        disableOverlayClose
        spotlightClicks={false}
        tooltipComponent={WhatsNewTooltip}
        callback={handleTourCallback}
        styles={{ options: { overlayColor: 'rgba(0, 0, 0, 0.75)', zIndex: 10000, arrowColor: 'var(--surface)' } }}
      />
    </>
  );
}
