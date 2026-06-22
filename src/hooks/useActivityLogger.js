import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { logActivity } from '../services/adminService';

const PAGE_LABELS = {
  '/':            'Dashboard',
  '/homework':    'Homework',
  '/holidays':    'Holiday Homework',
  '/calendar':    'Calendar',
  '/syllabus':    'Syllabus Tracker',
  '/profile':     'Profile',
  '/class-info':  'Class Info',
  '/admin':       'Monitor Panel',
  '/admin-services': 'Admin Services',
};

export function useActivityLogger() {
  const { currentUser } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!currentUser?.phone) return;
    const label = PAGE_LABELS[pathname] || pathname;
    logActivity(currentUser.phone, label); // fire-and-forget
  }, [pathname, currentUser?.phone]);
}
