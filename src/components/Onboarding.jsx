import { useState, useEffect } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roles';
import { completeOnboarding } from '../auth/authService';
import { Sparkles, HandMetal, Navigation, Compass, LayoutDashboard } from 'lucide-react';

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
  const isMonitor = currentUser?.role === ROLES.MONITOR;
  
  return (
    <div 
      {...tooltipProps} 
      className={`custom-tooltip spring-up ${isMonitor ? 'role-monitor' : 'role-student'}`}
    >
      <div className="tooltip-header stagger-1">
        {step.icon && <span style={{ color: isMonitor ? 'var(--secondary)' : 'var(--primary)' }}>{step.icon}</span>}
        <h3 className="tooltip-title" style={{
          background: isMonitor ? 'linear-gradient(135deg, var(--secondary), #f472b6)' : 'linear-gradient(135deg, var(--primary), #a78bfa)',
          WebkitBackgroundClip: 'text',
          color: 'transparent'
        }}>
          {step.title}
        </h3>
      </div>
      <div className="tooltip-body stagger-2">
        {step.content}
      </div>
      <div className="tooltip-footer stagger-3">
        <div className="tooltip-progress">
          {index + 1} / {step.totalSteps}
        </div>
        <div className="tooltip-controls">
          {!isLastStep && (
            <button {...closeProps} className="tooltip-skip">
              Skip
            </button>
          )}
          {index > 0 && (
            <button {...backProps} className="tooltip-btn secondary">
              Back
            </button>
          )}
          <button {...primaryProps} className="tooltip-btn primary" style={{ background: isMonitor ? 'var(--secondary)' : 'var(--primary)' }}>
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

const getStudentSteps = (user) => [
  {
    target: 'body',
    placement: 'center',
    title: `Hi, ${user.name.split(' ')[0]}!`,
    icon: <HandMetal size={24} />,
    content: 'Welcome to your Student Dashboard. Let\'s take a quick tour of what you can do here to stay on top of your work.',
    disableBeacon: true,
    totalSteps: 5
  },
  {
    target: '.nav-links a[href="/homework"]',
    title: 'Daily Homework',
    icon: <Navigation size={22} />,
    content: 'Find all your daily homework assignments here. They are updated regularly so you never miss a task.',
    totalSteps: 5
  },
  {
    target: '.nav-links a[href="/holidays"]',
    title: 'Holiday Homework',
    icon: <Compass size={22} />,
    content: 'Download holiday assignments and track your progress easily during breaks.',
    totalSteps: 5
  },
  {
    target: '.nav-links a[href="/calendar"]',
    title: 'School Calendar',
    icon: <LayoutDashboard size={22} />,
    content: 'Stay updated with the school calendar, upcoming events, and important dates right here.',
    totalSteps: 5
  },
  {
    target: '.nav-user-menu',
    title: 'Your Profile',
    icon: <Sparkles size={22} />,
    content: 'Click your initials to update your photo, view your details, and manage your account.',
    totalSteps: 5
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
    totalSteps: 5
  },
  ...getStudentSteps(user).slice(1, 4).map(s => ({ ...s, totalSteps: 5 })),
  {
    target: '.nav-user-menu',
    title: 'Monitor Profile',
    icon: <Sparkles size={22} />,
    content: 'This is your profile. Soon, you will find special monitor-only tools and administrative options here!',
    totalSteps: 5
  }
];

export default function Onboarding({ forceRun, forceRole, onCloseForceRun }) {
  const { currentUser } = useAuth();
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    
    // Check if we are forcing the run (from Admin profile)
    if (forceRun && forceRole) {
      setSteps(forceRole === ROLES.MONITOR ? getMonitorSteps(currentUser) : getStudentSteps(currentUser));
      setRun(true);
      return;
    }

    // Normal run check — use both Firestore field and localStorage as guard
    const localKey = `onboarding_done_${currentUser.phone}`;
    const alreadyDone = currentUser.onboardingCompleted || localStorage.getItem(localKey);
    if (!alreadyDone && currentUser.role !== ROLES.ADMIN) {
      setSteps(currentUser.role === ROLES.MONITOR ? getMonitorSteps(currentUser) : getStudentSteps(currentUser));
      setRun(true);
    }
  }, [currentUser, forceRun, forceRole]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      setRun(false);
      if (forceRun && onCloseForceRun) {
        onCloseForceRun();
      } else if (currentUser) {
        // Mark done in both localStorage (immediate) and Firestore (persistent)
        localStorage.setItem(`onboarding_done_${currentUser.phone}`, '1');
        completeOnboarding(currentUser.phone).catch(console.error);
      }
    }
  };

  if (!currentUser) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      tooltipComponent={CustomTooltip}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          overlayColor: 'rgba(0, 0, 0, 0.65)',
        }
      }}
    />
  );
}
