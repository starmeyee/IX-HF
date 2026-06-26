import { useState, useEffect, useCallback } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roles';
import { completeOnboarding } from '../auth/authService';
import { Sparkles, HandMetal, Navigation, Compass, LayoutDashboard, CalendarCheck, Wrench } from 'lucide-react';

const CustomTooltip = ({
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
}) => {
  const { currentUser } = useAuth();
  const isMonitor  = currentUser?.role === ROLES.MONITOR;
  const isTeacher  = currentUser?.role === ROLES.TEACHER;
  const accentVar  = isMonitor ? 'var(--secondary)' : isTeacher ? '#10b981' : 'var(--primary)';
  const gradientBg = isMonitor
    ? 'linear-gradient(135deg, var(--secondary), #f472b6)'
    : isTeacher
      ? 'linear-gradient(135deg, #10b981, #3b82f6)'
      : 'linear-gradient(135deg, var(--primary), #a78bfa)';

  return (
    <div
      {...tooltipProps}
      className={`custom-tooltip spring-up ${isMonitor ? 'role-monitor' : isTeacher ? 'role-teacher' : 'role-student'}`}
    >
      <div className="tooltip-header stagger-1">
        {step.icon && <span style={{ color: accentVar }}>{step.icon}</span>}
        <h3 className="tooltip-title" style={{ background: gradientBg, WebkitBackgroundClip: 'text', color: 'transparent' }}>
          {step.title}
        </h3>
      </div>
      <div className="tooltip-body stagger-2">{step.content}</div>
      <div className="tooltip-footer stagger-3">
        <div className="tooltip-progress">{index + 1} / {step.totalSteps}</div>
        <div className="tooltip-controls">
          {!isLastStep && <button {...closeProps} className="tooltip-skip">Skip</button>}
          {index > 0 && <button {...backProps} className="tooltip-btn secondary">Back</button>}
          <button {...primaryProps} className="tooltip-btn primary" style={{ background: accentVar }}>
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

const getTeacherSteps = (user) => [
  {
    target: 'body',
    placement: 'center',
    title: `Welcome, ${user.name.split(' ')[0]}!`,
    icon: <HandMetal size={24} />,
    content: 'This is your Teacher Dashboard. Let\'s take a quick look at what\'s available to you.',
    disableBeacon: true,
    totalSteps: 4,
  },
  {
    target: '[data-tour="attendance-panel"]',
    title: 'Class Attendance',
    icon: <CalendarCheck size={22} />,
    content: 'See the monthly attendance average across all students at a glance right from your dashboard.',
    placement: 'top',
    totalSteps: 4,
  },
  {
    target: '.nav-links a[href="/teacher-tools"]',
    title: 'Teacher Tools',
    icon: <Wrench size={22} />,
    content: 'Post and manage class notices, view attendance stats, and access the Maths Dashboard — all from one place.',
    totalSteps: 4,
  },
  {
    target: '.nav-user-menu',
    title: 'Your Profile',
    icon: <Sparkles size={22} />,
    content: 'Click your initials to access your profile, class info, and account settings.',
    totalSteps: 4,
  },
];

const getStudentSteps = (user) => [
  {
    target: 'body',
    placement: 'center',
    title: `Hi, ${user.name.split(' ')[0]}!`,
    icon: <HandMetal size={24} />,
    content: 'Welcome to your Student Dashboard. Let\'s take a quick tour of what you can do here to stay on top of your work.',
    disableBeacon: true,
    totalSteps: 6
  },
  {
    target: '[data-tour="attendance-panel"]',
    title: 'Track Your Attendance',
    icon: <CalendarCheck size={22} />,
    content: 'This is your attendance tracker. Every working day counts as present by default — if you miss a day, just tap that date to mark yourself absent. It updates your attendance percentage automatically so you always stay on top of it.',
    placement: 'top',
    totalSteps: 6
  },
  {
    target: '.nav-links a[href="/homework"]',
    title: 'Daily Homework',
    icon: <Navigation size={22} />,
    content: 'Find all your daily homework assignments here. They are updated regularly so you never miss a task.',
    totalSteps: 6
  },
  {
    target: '.nav-links a[href="/holidays"]',
    title: 'Holiday Homework',
    icon: <Compass size={22} />,
    content: 'Download holiday assignments and track your progress easily during breaks.',
    totalSteps: 6
  },
  {
    target: '.nav-links a[href="/calendar"]',
    title: 'School Calendar',
    icon: <LayoutDashboard size={22} />,
    content: 'Stay updated with the school calendar, upcoming events, and important dates right here.',
    totalSteps: 6
  },
  {
    target: '.nav-user-menu',
    title: 'Your Profile',
    icon: <Sparkles size={22} />,
    content: 'Click your initials to update your photo, view your details, see class info, and manage your account.',
    totalSteps: 6
  }
];

const getMonitorSteps = (user) => [
  {
    target: 'body',
    placement: 'center',
    title: `Hello Monitor ${user.name.split(' ')[0]}!`,
    icon: <Sparkles size={24} />,
    content: 'Welcome to your Dashboard. As a monitor, you have special responsibilities and features. Let\'s take a look.',
    disableBeacon: true,
    totalSteps: 6
  },
  ...getStudentSteps(user).slice(1, 5).map(s => ({ ...s, totalSteps: 6 })),
  {
    target: '.nav-links a[href="/admin"]',
    title: 'Monitor Panel',
    icon: <Sparkles size={22} />,
    content: 'As a monitor, you can post notices for the whole class and add daily homework right from the Panel. Notices you post appear on everyone\'s dashboard.',
    totalSteps: 6
  }
];

function stepsForRole(user) {
  if (user.role === ROLES.TEACHER)  return getTeacherSteps(user);
  if (user.role === ROLES.MONITOR)  return getMonitorSteps(user);
  return getStudentSteps(user);
}

export default function Onboarding({ forceRun, forceRole, onCloseForceRun }) {
  const { currentUser, forceTour, clearTour, refreshUser } = useAuth();
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState([]);

  const effectiveForceRun  = forceRun  || !!forceTour;
  const effectiveForceRole = forceRole || forceTour?.role || null;

  useEffect(() => {
    if (!currentUser) return;

    if (effectiveForceRun && effectiveForceRole) {
      setSteps(stepsForRole({ ...currentUser, role: effectiveForceRole }));
      setRun(true);
      return;
    }

    if (currentUser.role === ROLES.ADMIN) return;

    const localKey = `onboarding_done_${currentUser.phone}`;
    const alreadyDone = currentUser.onboardingCompleted || localStorage.getItem(localKey);
    if (!alreadyDone) {
      setSteps(stepsForRole(currentUser));
      setRun(true);
    }
  }, [currentUser?.phone, currentUser?.onboardingCompleted, effectiveForceRun, effectiveForceRole]);

  const handleJoyrideCallback = useCallback((data) => {
    const { status } = data;
    if (![STATUS.FINISHED, STATUS.SKIPPED].includes(status)) return;

    setRun(false); // stop immediately — prevents beacon artifact

    if (forceRun && onCloseForceRun) {
      onCloseForceRun();
    } else if (forceTour) {
      clearTour();
    } else if (currentUser) {
      const localKey = `onboarding_done_${currentUser.phone}`;
      localStorage.setItem(localKey, '1'); // write immediately so refresh doesn't re-trigger
      completeOnboarding(currentUser.phone)
        .then(() => refreshUser(currentUser.phone)) // sync currentUser.onboardingCompleted
        .catch(console.error);
    }
  }, [currentUser, forceRun, forceTour, onCloseForceRun, clearTour, refreshUser]);

  if (!currentUser) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      disableScrolling
      tooltipComponent={CustomTooltip}
      callback={handleJoyrideCallback}
      styles={{ options: { overlayColor: 'rgba(0, 0, 0, 0.65)', zIndex: 10000 } }}
    />
  );
}
