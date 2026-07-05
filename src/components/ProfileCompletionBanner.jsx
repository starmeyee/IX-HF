/**
 * ProfileCompletionBanner.jsx
 *
 * Shows a profile-completion progress bar on the student dashboard.
 * When expanded, lists each step (photo, email, notifications, install)
 * with inline action buttons. When every step is complete the banner
 * celebrates and then permanently hides itself.
 *
 * Steps tracked:
 *   1. Profile photo   — localStorage key `photo_${phone}`
 *   2. Recovery email  — currentUser.emailVerified === true
 *   3. Notifications   — Notification.permission === 'granted'
 *   4. Install app     — display-mode: standalone (PWA)
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, Mail, Bell, Smartphone,
  CheckCircle2, ChevronDown, ChevronUp, X, Zap,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roles';
import {
  isPushSupportedSync,
  isIosNeedsInstall,
  permissionState,
  requestPermissionAndToken,
} from '../services/pushService';

// ── persistence helpers ────────────────────────────────────────
function getDismissedKey(phone) {
  return `profile_completion_done_${phone}`;
}
function isPermDismissed(phone) {
  return localStorage.getItem(getDismissedKey(phone)) === '1';
}
function permDismiss(phone) {
  localStorage.setItem(getDismissedKey(phone), '1');
}

// ── celebration popup ──────────────────────────────────────────
function CelebrationPopup({ message, emoji, onDone }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); setTimeout(onDone, 300); }, 2600);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, pointerEvents: 'none',
      transition: 'opacity 0.3s, transform 0.3s',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(16px)',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(30,30,45,0.98) 0%, rgba(20,20,35,0.98) 100%)',
        border: '1px solid rgba(139,92,246,0.4)',
        borderRadius: 16,
        padding: '0.9rem 1.4rem',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(139,92,246,0.15)',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        minWidth: 220, maxWidth: 340,
        backdropFilter: 'blur(12px)',
      }}>
        <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{emoji}</span>
        <p style={{
          margin: 0, fontSize: '0.9rem', fontWeight: 600,
          color: 'var(--text-primary)', lineHeight: 1.4,
        }}>{message}</p>
      </div>
    </div>
  );
}

// ── main component ─────────────────────────────────────────────
export default function ProfileCompletionBanner() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifState, setNotifState] = useState(() => permissionState());
  const [isPwa, setIsPwa] = useState(() =>
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
  const [celebration, setCelebration] = useState(null); // { message, emoji }
  const [hidden, setHidden] = useState(false);
  const bannerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (bannerRef.current && !bannerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  // Listen for PWA install via mediaQuery change
  useEffect(() => {
    const mq = window.matchMedia?.('(display-mode: standalone)');
    if (!mq) return;
    function onChange(e) { setIsPwa(e.matches); }
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  if (!currentUser) return null;
  if (currentUser.role === ROLES.TEACHER) return null;
  if (hidden) return null;
  if (isPermDismissed(currentUser.phone)) return null;

  const hasPhoto = !!localStorage.getItem(`photo_${currentUser.phone}`);
  const hasEmail = !!(currentUser.email && currentUser.emailVerified);
  const hasNotif = notifState === 'granted';
  const hasApp   = isPwa;

  const steps = [
    {
      id: 'photo',
      icon: <Camera size={18} />,
      label: 'Add profile photo',
      done: hasPhoto,
      doneLabel: 'Profile photo added',
      actionLabel: 'Go to Profile',
      celebration: { message: 'Looking good! Profile photo saved.', emoji: '📸' },
      onAction: () => { setOpen(false); navigate('/profile'); },
    },
    {
      id: 'email',
      icon: <Mail size={18} />,
      label: 'Add recovery email',
      done: hasEmail,
      doneLabel: 'Recovery email verified',
      actionLabel: 'Add email',
      celebration: { message: "Great! Your account is now recoverable.", emoji: '✉️' },
      onAction: () => { setOpen(false); navigate('/profile'); },
    },
    {
      id: 'notif',
      icon: <Bell size={18} />,
      label: 'Enable notifications',
      done: hasNotif,
      doneLabel: 'Notifications enabled',
      actionLabel: notifState === 'denied' ? 'Allow in browser settings' : 'Enable',
      celebration: { message: "You'll be notified for everything important!", emoji: '🔔' },
      disabled: notifState === 'denied',
      onAction: async () => {
        if (notifState === 'denied') return;
        const token = await requestPermissionAndToken(currentUser);
        const newState = permissionState();
        setNotifState(newState);
        if (token || newState === 'granted') {
          fire({ message: "You'll be notified for everything important!", emoji: '🔔' });
        }
      },
    },
    {
      id: 'install',
      icon: <Smartphone size={18} />,
      label: 'Install app on phone',
      done: hasApp,
      doneLabel: 'App installed',
      actionLabel: isIosNeedsInstall() ? 'Use Share → Add to Home Screen' : 'Install',
      celebration: { message: 'App installed! Access it anytime from your home screen.', emoji: '📱' },
      onAction: () => {
        if (isIosNeedsInstall()) {
          alert('On iPhone/iPad: tap the Share button (□↑) then "Add to Home Screen".');
          return;
        }
        // PWA beforeinstallprompt is stored globally by InstallPrompt.jsx
        if (window.__pwaInstallPrompt) {
          window.__pwaInstallPrompt.prompt();
          window.__pwaInstallPrompt.userChoice.then(() => {
            setIsPwa(window.matchMedia?.('(display-mode: standalone)').matches);
          });
        } else {
          alert('To install: use your browser menu → "Add to Home Screen" or "Install app".');
        }
      },
    },
  ];

  // If push not supported on this platform, skip the notifications step
  const visibleSteps = steps.filter(s => {
    if (s.id === 'notif' && !isPushSupportedSync()) return false;
    return true;
  });

  const completedCount = visibleSteps.filter(s => s.done).length;
  const totalCount     = visibleSteps.length;
  const pct            = Math.round((completedCount / totalCount) * 100);
  const allDone        = completedCount === totalCount;

  function fire(cel) {
    setCelebration(cel);
  }

  function handleDismissComplete() {
    // 100% → perm hide
    if (allDone) {
      permDismiss(currentUser.phone);
      setHidden(true);
    }
    setCelebration(null);
  }

  // When all steps become done, fire a final celebration and perm-hide
  useEffect(() => {
    if (allDone && !isPermDismissed(currentUser.phone)) {
      fire({ message: 'Profile 100% complete! You\'re all set 🎉', emoji: '🏆' });
      setTimeout(() => {
        permDismiss(currentUser.phone);
        setHidden(true);
      }, 3200);
    }
  }, [allDone]); // eslint-disable-line react-hooks/exhaustive-deps

  const arcColor = pct === 100 ? '#10b981' : pct >= 60 ? '#f59e0b' : 'var(--primary)';

  return (
    <>
      {celebration && (
        <CelebrationPopup
          message={celebration.message}
          emoji={celebration.emoji}
          onDone={handleDismissComplete}
        />
      )}

      <div ref={bannerRef} className="profile-completion-banner animate-fade-in">
        {/* ── Main clickable row ── */}
        <button
          className="pcb-trigger"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
        >
          {/* Circular progress */}
          <div className="pcb-ring-wrap">
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="22" cy="22" r="17" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
              <circle
                cx="22" cy="22" r="17" fill="none"
                stroke={arcColor}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 17}`}
                strokeDashoffset={`${2 * Math.PI * 17 * (1 - pct / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s' }}
              />
            </svg>
            <span className="pcb-ring-pct" style={{ color: arcColor }}>{pct}%</span>
          </div>

          {/* Text */}
          <div className="pcb-text">
            <p className="pcb-title">
              {allDone ? '🏆 Profile complete!' : 'Complete your profile'}
            </p>
            <p className="pcb-subtitle">
              {allDone
                ? 'All steps done — you\'re fully set up'
                : `${completedCount} of ${totalCount} steps done · tap to continue`}
            </p>
          </div>

          {/* Chevron */}
          <div className="pcb-chevron" style={{ color: 'var(--text-muted)' }}>
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {/* ── Expandable step list ── */}
        <div className={`pcb-steps-wrap ${open ? 'open' : ''}`}>
          <div className="pcb-steps">
            {visibleSteps.map((step) => (
              <div
                key={step.id}
                className={`pcb-step ${step.done ? 'done' : ''} ${step.disabled ? 'disabled' : ''}`}
              >
                {/* Icon */}
                <div className="pcb-step-icon">
                  {step.done
                    ? <CheckCircle2 size={18} color="#10b981" />
                    : <span style={{ color: 'var(--text-muted)', opacity: 0.7 }}>{step.icon}</span>}
                </div>

                {/* Label */}
                <div className="pcb-step-label">
                  <p className="pcb-step-name" style={{ textDecoration: step.done ? 'line-through' : 'none', color: step.done ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {step.done ? step.doneLabel : step.label}
                  </p>
                </div>

                {/* Action button */}
                {!step.done && (
                  <button
                    className="pcb-step-btn"
                    disabled={step.disabled}
                    onClick={async () => {
                      await step.onAction();
                      // For non-async steps (navigate), fire after a tick if done state changed
                      // For async steps (notifications), fire is called inside onAction
                      if (step.id !== 'notif' && step.id !== 'install') {
                        // photo and email actions navigate away — user comes back and state refreshes
                      }
                    }}
                  >
                    {step.actionLabel}
                  </button>
                )}
              </div>
            ))}

            {/* Progress bar at bottom of list */}
            <div className="pcb-bottom-bar">
              <div className="pcb-progress-track">
                <div
                  className="pcb-progress-fill"
                  style={{ width: `${pct}%`, background: arcColor }}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {pct}% done
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
