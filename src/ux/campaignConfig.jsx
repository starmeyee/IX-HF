/**
 * campaignConfig.js
 * Master configuration for every user-facing UX element in the app.
 *
 * Adding a new campaign = adding one object here. No new components needed
 * unless the type is genuinely new.
 *
 * Campaign shape:
 * {
 *   id:        string       — unique, stable identifier (used as storage key)
 *   type:      string       — 'banner'|'modal'|'tour'|'toast'|'prompt'|'overlay'
 *   priority:  number       — higher = shown first / on top (1-100)
 *   storage:   string       — 'local'|'session'|'firestore'|'both'
 *   condition: (user) => bool — evaluated at runtime; user is currentUser from AuthContext
 *   dismissible: bool       — whether the user can close it without completing
 *   blocking:  bool         — if true, blocks other campaigns until resolved
 *   content:   object       — type-specific payload (title, body, steps, etc.)
 * }
 */

import React from 'react';
import {
  BookMarked, ClipboardList, TrendingUp, Bell,
  BarChart2, GitMerge, Mail, HandMetal, Navigation,
  Compass, LayoutDashboard, Sparkles, CalendarCheck,
  Wrench, Download, GraduationCap,
} from 'lucide-react';
import { ROLES } from '../auth/roles';
import {
  isPushSupportedSync, isIosNeedsInstall, permissionState,
} from '../services/pushService';

// ── Onboarding tour step builders ────────────────────────────────────────────
// Kept here so they're driven by config, not scattered across components.

function getStudentSteps(user) {
  return [
    {
      target: 'body', placement: 'center',
      title: `Hi, ${user.name.split(' ')[0]}!`,
      icon: <HandMetal size={24} />,
      content: "Welcome to your Student Dashboard. Let's take a quick tour of what you can do here to stay on top of your work.",
      disableBeacon: true, totalSteps: 6,
    },
    {
      target: '[data-tour="attendance-panel"]', placement: 'top',
      title: 'Track Your Attendance',
      icon: <CalendarCheck size={22} />,
      content: "This is your attendance tracker. Every working day counts as present by default — if you miss a day, just tap that date to mark yourself absent.",
      totalSteps: 6,
    },
    {
      target: '.nav-links a[href="/homework"]',
      title: 'Daily Homework', icon: <Navigation size={22} />,
      content: "Find all your daily homework assignments here. They are updated regularly so you never miss a task.",
      totalSteps: 6,
    },
    {
      target: '.nav-links a[href="/holidays"]',
      title: 'Holiday Homework', icon: <Compass size={22} />,
      content: "Download holiday assignments and track your progress easily during breaks.",
      totalSteps: 6,
    },
    {
      target: '.nav-links a[href="/calendar"]',
      title: 'School Calendar', icon: <LayoutDashboard size={22} />,
      content: "Stay updated with the school calendar, upcoming events, and important dates right here.",
      totalSteps: 6,
    },
    {
      target: '.nav-user-menu',
      title: 'Your Profile', icon: <Sparkles size={22} />,
      content: "Click your initials to update your photo, view your details, see class info, and manage your account.",
      totalSteps: 6,
    },
  ].map(s => ({ ...s, disableBeacon: true }));
}

function getMonitorSteps(user) {
  const studentMid = getStudentSteps(user).slice(1, 5).map(s => ({ ...s, totalSteps: 6 }));
  return [
    {
      target: 'body', placement: 'center',
      title: `Hello Monitor ${user.name.split(' ')[0]}!`,
      icon: <Sparkles size={24} />,
      content: "Welcome to your Dashboard. As a monitor, you have special responsibilities and features. Let's take a look.",
      disableBeacon: true, totalSteps: 6,
    },
    ...studentMid,
    {
      target: '.nav-links a[href="/admin"]',
      title: 'Monitor Panel', icon: <Sparkles size={22} />,
      content: "As a monitor, you can post notices for the whole class and add daily homework right from the Panel.",
      totalSteps: 6,
    },
  ].map(s => ({ ...s, disableBeacon: true }));
}

function getTeacherSteps(user) {
  return [
    {
      target: 'body', placement: 'center',
      title: `Welcome, ${user.name.split(' ')[0]}!`,
      icon: <HandMetal size={24} />,
      content: "This is your Teacher Dashboard. Let's take a quick look at what's available to you.",
      disableBeacon: true, totalSteps: 4,
    },
    {
      target: '[data-tour="attendance-panel"]', placement: 'top',
      title: 'Class Attendance', icon: <CalendarCheck size={22} />,
      content: "See the monthly attendance average across all students at a glance right from your dashboard.",
      totalSteps: 4,
    },
    {
      target: '.nav-links a[href="/teacher-tools"]',
      title: 'Teacher Tools', icon: <Wrench size={22} />,
      content: "Post and manage class notices, view attendance stats, and access the Maths Dashboard — all from one place.",
      totalSteps: 4,
    },
    {
      target: '.nav-user-menu',
      title: 'Your Profile', icon: <Sparkles size={22} />,
      content: "Click your initials to access your profile, class info, and account settings.",
      totalSteps: 4,
    },
  ].map(s => ({ ...s, disableBeacon: true }));
}

export function getOnboardingSteps(user) {
  if (!user) return [];
  if (user.role === ROLES.TEACHER)  return getTeacherSteps(user);
  if (user.role === ROLES.MONITOR)  return getMonitorSteps(user);
  return getStudentSteps(user);
}

// What's New tour steps (centred, no spotlight)
export const WHATS_NEW_TOUR_STEPS = [
  {
    target: 'body', placement: 'center',
    title: 'Syllabus Tracking', icon: <BookMarked size={22} />,
    content: "On your dashboard you'll find a Syllabus Progress bar. Open it to see how much of every subject the class has completed — and tick off what your own copy has covered, topic by topic.",
    disableBeacon: true,
  },
  {
    target: 'body', placement: 'center',
    title: 'New Attendance % (CBSE style)', icon: <TrendingUp size={22} />,
    content: "Your attendance percentage is now the average of each month's attendance — the same way CBSE calculates it — so every month counts equally.",
  },
  {
    target: 'body', placement: 'center',
    title: 'Classwork Log', icon: <ClipboardList size={22} />,
    content: "The Homework page now has a Classwork tab, and your dashboard shows the latest classwork — so you can see exactly what was done in each period, every day.",
  },
  {
    target: 'body', placement: 'center',
    title: 'Stay Notified', icon: <Bell size={22} />,
    content: "Turn on notifications to get instant alerts for new notices, homework and classwork. You can view the full alert history any time from your profile. Enjoy the new features!",
  },
].map((s, i, arr) => ({ ...s, totalSteps: arr.length, disableBeacon: true }));

// Notes page tour steps
export const NOTES_TOUR_STEPS = [
  {
    target: '[data-tour="spark-wallet"]',
    title: '⚡ Your Sparks',
    content: "Sparks are your currency here. You start with 10. Spend them to read notes, earn them back by uploading your own.",
    disableBeacon: true, placement: 'bottom',
  },
  {
    target: '[data-tour="tab-browse"]',
    title: '📚 Browse Notes',
    content: "Tap here to find notes. Go Section → Subject → Chapter. Opening a chapter for the first time costs 2 Sparks — after that it's free forever.",
    placement: 'bottom',
  },
  {
    target: '[data-tour="tab-purchases"]',
    title: '🔓 Your Purchases',
    content: "Every chapter you've already unlocked lives here. Come back anytime to re-read them — totally free, no extra Sparks needed.",
    placement: 'bottom',
  },
  {
    target: '[data-tour="tab-mysubmissions"]',
    title: '📤 My Submissions',
    content: "See the notes you've uploaded here. Once the admin approves one, you automatically get +4 Sparks.",
    placement: 'bottom',
  },
  {
    target: '[data-tour="upload-fab"]',
    title: '➕ Upload Notes',
    content: "Have good notes? Upload a PDF for any chapter. Submit it — if the admin approves, you earn 4 Sparks. Tap the ? anytime to see this guide again.",
    placement: 'top',
  },
].map((s, i, arr) => ({ ...s, totalSteps: arr.length, disableBeacon: true }));

// ── Master campaign list ──────────────────────────────────────────────────────

const CAMPAIGNS = [

  // ── CRITICAL: Merge Banner ────────────────────────────────────────────────
  {
    id: 'merge-banner-v1',
    type: 'banner',
    priority: 100,
    storage: 'firestore',
    blocking: false,
    dismissible: false, // overridden to true if no password reset needed
    condition: (user) => !!(user && user.mergedAt && !user.mergeBannerSeen),
    content: {
      variant: 'merge',
      icon: GitMerge,
      title: 'Your accounts have been merged.',
      body: (user) => `Your two phone numbers are now linked to one profile. All your data has been combined. You can log in with either number.`,
    },
  },

  // ── CRITICAL: Onboarding tour ─────────────────────────────────────────────
  {
    id: 'onboarding-v1',
    type: 'tour',
    priority: 90,
    storage: 'firestore',
    blocking: false,
    dismissible: true,
    condition: (user) => !!(
      user &&
      user.role !== ROLES.ADMIN &&
      !user.onboardingCompleted
    ),
    content: {
      getSteps: (user) => getOnboardingSteps(user),
      role: (user) => user?.role,
    },
  },

  // ── HIGH: What's New Modal ────────────────────────────────────────────────
  {
    id: 'whats-new-v1',
    type: 'modal',
    priority: 80,
    storage: 'firestore',
    blocking: false,
    dismissible: true,
    condition: (user) => !!(
      user &&
      !user.whatsNewSeen_v1 &&
      // Wait for onboarding to finish first (reads Firestore field, cross-device safe)
      (user.onboardingCompleted || user.role === ROLES.ADMIN)
    ),
    content: {
      variant: 'whats-new',
      badge: Sparkles,
      title: "Welcome to X HI Portal",
      subtitle: "We've added some powerful new features — here's what's new:",
      features: [
        { icon: BookMarked, color: '#8b5cf6', bg: 'rgba(139,92,246,0.14)', title: 'Syllabus Tracking', body: 'See how much of each subject is done and tick off your own progress.' },
        { icon: ClipboardList, color: '#FF6D00', bg: 'rgba(255,109,0,0.14)', title: 'Classwork Log', body: 'Check what was taught in every period, every day.' },
        { icon: TrendingUp, color: '#10b981', bg: 'rgba(16,185,129,0.14)', title: 'New Attendance % (CBSE style)', body: 'Now calculated as the average of each monthly attendance.' },
      ],
      tourSteps: WHATS_NEW_TOUR_STEPS,
    },
  },

  // ── HIGH: Marks Banner ────────────────────────────────────────────────────
  {
    id: 'marks-banner-v1',
    type: 'banner',
    priority: 70,
    storage: 'firestore',
    blocking: false,
    dismissible: true,
    condition: (user) => !!(
      user &&
      user.rollNo &&
      user.rollNo !== 0 &&
      user.role !== ROLES.TEACHER
    ),
    content: {
      variant: 'info',
      icon: BarChart2,
      title: 'Your Maths test scores are here!',
      body: 'Check your Test 1 & Test 2 marks — and report if anything looks wrong.',
      cta: 'View My Scores',
      ctaRoute: '/test-scores',
    },
  },

  // ── HIGH: Notification Prompt ─────────────────────────────────────────────
  {
    id: 'notif-prompt-v1',
    type: 'prompt',
    priority: 60,
    storage: 'firestore',
    blocking: false,
    dismissible: true,
    condition: (user) => !!(
      user &&
      isPushSupportedSync() &&
      !isIosNeedsInstall() &&
      permissionState() === 'default'
    ),
    content: {
      variant: 'notification',
      icon: Bell,
      title: 'Turn on notifications',
      body: 'Get notified about new notices, homework & updates.',
      cta: 'Enable',
    },
  },

  // ── MEDIUM: Email Reminder ────────────────────────────────────────────────
  {
    id: 'email-reminder-v1',
    type: 'banner',
    priority: 50,
    storage: 'session',
    blocking: false,
    dismissible: true,
    condition: (user) => !!(
      user &&
      user.role !== ROLES.TEACHER &&
      !user.email &&
      !sessionStorage.getItem(`ux_session_email-reminder-v1_${user.phone}`)
    ),
    content: {
      variant: 'info',
      icon: Mail,
      title: 'Add a recovery email',
      body: 'Add a recovery email to reset your password if you ever forget it.',
      cta: 'Add Email',
      ctaRoute: '/profile',
    },
  },

  // ── MEDIUM: PWA Install Prompt ────────────────────────────────────────────
  {
    id: 'pwa-install-v1',
    type: 'prompt',
    priority: 40,
    storage: 'firestore',
    blocking: false,
    dismissible: true,
    // condition evaluated in InstallPrompt itself (needs browser event)
    // — managed externally, this config entry is for admin/reset tooling
    condition: () => false, // handled by InstallPrompt component directly
    content: {
      variant: 'install',
      icon: Download,
      title: 'Add IX HF to your Home Screen',
      body: 'Access homework, attendance, and notices instantly — no browser needed.',
    },
  },

  // ── MEDIUM: Notes Page Tour ───────────────────────────────────────────────
  {
    id: 'notes-tour-v1',
    type: 'tour',
    priority: 30,
    storage: 'firestore',
    blocking: false,
    dismissible: true,
    condition: (user) => !!(
      user &&
      user.role !== ROLES.TEACHER &&
      !user['ux_notes-tour-v1'] &&
      // Snooze check: if snoozed, only show again after 7 days (Firestore field)
      (() => {
        const snooze = user['ux_notes-tour-v1_snooze'];
        if (!snooze) return true;
        return Date.now() > snooze;
      })()
    ),
    content: {
      getSteps: () => NOTES_TOUR_STEPS,
      role: () => null,
    },
  },

  // ── MEDIUM: Study Together Feature Announcement ───────────────────────────
  {
    id: 'study-together-announcement-v1',
    type: 'banner',
    priority: 65,
    storage: 'firestore',
    blocking: false,
    dismissible: true,
    condition: (user) => !!(
      user &&
      !user['ux_study-together-announcement-v1']
    ),
    content: {
      variant: 'info',
      icon: GraduationCap,
      title: '🎓 New Feature: Study Together',
      body: 'Create or join live study rooms around any YouTube lecture. Real-time chat, shared presence, and owner controls — all in one place.',
      cta: 'Try it now',
      ctaRoute: '/study-together',
    },
  },

];

export default CAMPAIGNS;

/**
 * Look up a single campaign by ID.
 * @param {string} id
 */
export function getCampaign(id) {
  return CAMPAIGNS.find(c => c.id === id) || null;
}
