import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import Onboarding from './components/Onboarding';
import WhatsNew from './components/WhatsNew';
import InstallPrompt from './components/InstallPrompt';
import NotificationPrompt from './components/NotificationPrompt';
import ForegroundToast from './components/ForegroundToast';
import { AuthProvider, useAuth } from './auth/AuthContext';
import StudentDashboard from './pages/StudentDashboard';
import Homework from './pages/Homework';
import HolidayHomework from './pages/HolidayHomework';
import SchoolCalendar from './pages/SchoolCalendar';
import ProfilePage from './pages/ProfilePage';
import AdminPanel from './pages/AdminPanel';
import SyllabusPage from './pages/SyllabusPage';
import ClassInfoPage from './pages/ClassInfoPage';
import AdminServicesPage from './pages/AdminServicesPage';
import TestScoresPage from './pages/TestScoresPage';
import NotificationsPage from './pages/NotificationsPage';
import MathsDashboard from './pages/MathsDashboard';
import NotesPage from './pages/NotesPage';
import { Heart } from 'lucide-react';
import { checkAndConsumeEmailLink } from './firebase';
import { markEmailVerified } from './auth/authService';
import { useActivityLogger } from './hooks/useActivityLogger';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function AppInner() {
  useActivityLogger();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  // pendingReset: { phone } — set when email-reset link is clicked; triggers reset form in AuthModal
  const [resetPhone, setResetPhone] = useState(null);

  useEffect(() => {
    async function handleEmailLink() {
      try {
        const result = await checkAndConsumeEmailLink(window.location.href);
        if (!result) return;
        // Clean the URL so the link params don't linger
        window.history.replaceState(null, '', window.location.pathname);
        if (result.emailAction === 'verify') {
          // Get phone from session to mark verified
          const phone = localStorage.getItem('auth_phone');
          if (phone) {
            await markEmailVerified(phone);
            await refreshUser(phone);
          }
          navigate('/profile', { state: { emailVerified: true } });
        } else if (result.emailAction === 'reset' && result.phone) {
          setResetPhone(result.phone);
        }
      } catch (err) {
        console.warn('Email link handling failed:', err);
      }
    }
    handleEmailLink();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <ScrollToTop />
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <NotificationPrompt />
          <Routes>
            <Route path="/" element={<StudentDashboard />} />
            <Route path="/homework" element={<Homework />} />
            <Route path="/holidays" element={<HolidayHomework />} />
            <Route path="/calendar" element={<SchoolCalendar />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/syllabus" element={<SyllabusPage />} />
            <Route path="/class-info" element={<ClassInfoPage />} />
            <Route path="/admin-services" element={<AdminServicesPage />} />
            <Route path="/test-scores" element={<TestScoresPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/maths" element={<MathsDashboard />} />
            <Route path="/notes" element={<NotesPage />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            Designed and developed by <span
              onClick={() => {
                if (window.confirm("You are about to be redirected to WhatsApp to chat with Utkarsh. Do you want to continue?")) {
                  window.open("https://wa.me/918102783645", "_blank");
                }
              }}
              style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', transition: 'color 0.2s ease', textDecoration: 'underline', textUnderlineOffset: '2px' }}
              onMouseEnter={(e) => e.target.style.color = 'var(--primary-hover)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--primary)'}
            >Utkarsh</span> <Heart size={14} color="var(--secondary)" fill="var(--secondary)" />
          </p>
        </footer>
      </div>
      <AuthModal resetPhone={resetPhone} onResetConsumed={() => setResetPhone(null)} />
      <Onboarding />
      <WhatsNew />
      <InstallPrompt />
      <ForegroundToast />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
