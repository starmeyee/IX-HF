import { useState, useEffect, useRef } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roles';
import { completeOnboarding } from '../auth/authService';

const getStudentSteps = (user) => [
  {
    target: 'body',
    placement: 'center',
    content: (
      <div style={{ textAlign: 'center', animation: 'fadeInUp 0.5s ease-out' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Hi, {user.name.split(' ')[0]}! 👋</h2>
        <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Welcome to your Student Portal.</p>
        <p style={{ marginTop: '0.75rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Let's take a quick tour of what you can do here.</p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '.nav-links a[href="/homework"]',
    content: 'This is the Homework portal. You can find your daily homework assignments here.',
  },
  {
    target: '.nav-links a[href="/holidays"]',
    content: 'This is the Holiday Homework portal. You can download holiday assignments and track your progress.',
  },
  {
    target: '.nav-links a[href="/calendar"]',
    content: 'Stay updated with the school calendar and upcoming events right here.',
  },
  {
    target: '.nav-user-menu',
    content: 'Your profile is located here. Click your initials to update your photo and view your details.',
  }
];

const getMonitorSteps = (user) => [
  {
    target: 'body',
    placement: 'center',
    content: (
      <div style={{ textAlign: 'center', animation: 'fadeInUp 0.5s ease-out' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', color: 'var(--secondary)' }}>Hello Monitor {user.name.split(' ')[0]}! 🌟</h2>
        <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Welcome to your Dashboard.</p>
        <p style={{ marginTop: '0.75rem', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Let's take a quick tour of your special features.</p>
      </div>
    ),
    disableBeacon: true,
  },
  ...getStudentSteps(user).slice(1, 4), // share the middle steps
  {
    target: '.nav-user-menu',
    content: 'This is your profile. As a Monitor, you will see special tools added here in the future!',
  }
];

export default function Onboarding({ forceRun, forceRole, onCloseForceRun }) {
  const { currentUser } = useAuth();
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState([]);
  const hasRunThisSession = useRef(false);

  useEffect(() => {
    if (!currentUser) return;
    
    // Check if we are forcing the run (from Admin profile)
    if (forceRun && forceRole) {
      setSteps(forceRole === ROLES.MONITOR ? getMonitorSteps(currentUser) : getStudentSteps(currentUser));
      setRun(true);
      return;
    }

    // Normal run check
    if (!currentUser.onboardingCompleted && currentUser.role !== ROLES.ADMIN && !hasRunThisSession.current) {
      setSteps(currentUser.role === ROLES.MONITOR ? getMonitorSteps(currentUser) : getStudentSteps(currentUser));
      setRun(true);
      hasRunThisSession.current = true;
    }
  }, [currentUser, forceRun, forceRole]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (finishedStatuses.includes(status)) {
      setRun(false);
      // If it was a forced run, call the callback to reset it
      if (forceRun && onCloseForceRun) {
        onCloseForceRun();
      } else if (currentUser && !currentUser.onboardingCompleted) {
        // Otherwise save to DB
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
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'var(--primary, #3b82f6)',
          backgroundColor: 'var(--surface, #1e1e1e)',
          textColor: 'var(--text-primary, #ffffff)',
          arrowColor: 'var(--surface, #1e1e1e)',
          overlayColor: 'rgba(0, 0, 0, 0.65)',
        },
        tooltip: {
          borderRadius: '12px',
          fontFamily: 'inherit',
          border: '1px solid var(--border, #333)',
        },
        buttonNext: {
          borderRadius: '6px',
        },
        buttonBack: {
          color: 'var(--text-secondary, #a0a0a0)',
        },
        buttonSkip: {
          color: 'var(--text-secondary, #a0a0a0)',
        }
      }}
    />
  );
}
