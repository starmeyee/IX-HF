import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { Home, BookOpen, CalendarHeart, CalendarRange, LogIn, LogOut, ShieldAlert, Bell, User, Users, BookMarked, BarChart2, Wrench, BookCopy, ClipboardList, GraduationCap, Star } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roles';
import NotificationHistory from './NotificationHistory';
import { getNotificationHistory } from '../services/notificationHistoryService';

const NOTIF_SEEN_KEY = 'notif_last_seen';

export default function Navbar() {
  const { currentUser, openModal, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // Close both panels when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Check for unread notifications
  useEffect(() => {
    if (!currentUser) return;
    function check() {
      getNotificationHistory(1, currentUser.rollNo).then(([latest]) => {
        if (!latest) return;
        const seen = parseInt(localStorage.getItem(NOTIF_SEEN_KEY) || '0', 10);
        setHasUnread(latest.sentAt > seen);
      }).catch(() => {});
    }
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [currentUser]);

  function getInitials(name) {
    const parts = name.trim().split(' ');
    return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0]).toUpperCase();
  }

  function go(path) {
    setDropdownOpen(false);
    navigate(path);
  }

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <img src="/favicon.svg?v=4" alt="10th HI Logo" style={{ width: 28, height: 28, borderRadius: 6 }} />
        10th HI
      </div>
      <div className="nav-links">
        {currentUser?.role !== ROLES.STAR_BATCH_EXTERNAL && (
          <>
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Home size={20} /><span>Dashboard</span>
            </NavLink>
            {currentUser?.role !== ROLES.TEACHER && (
              <NavLink to="/homework" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <BookOpen size={20} /><span>Homework</span>
              </NavLink>
            )}
            {currentUser?.role !== ROLES.TEACHER && (
              <NavLink to="/notes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <BookCopy size={20} /><span>Notes</span>
              </NavLink>
            )}
            <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <CalendarRange size={20} /><span>Calendar</span>
            </NavLink>
            {currentUser?.role === ROLES.TEACHER && (
              <NavLink to="/teacher-tools" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Wrench size={20} /><span>Teacher Tools</span>
              </NavLink>
            )}
            {currentUser?.role === ROLES.TEACHER && (currentUser.recordTables?.length > 0) && (
              <NavLink to="/teacher-records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ClipboardList size={20} /><span>Records</span>
              </NavLink>
            )}
            {(currentUser?.isAdmin || currentUser?.role === ROLES.MONITOR) && (
              <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <ShieldAlert size={20} /><span>Monitor Panel</span>
              </NavLink>
            )}
          </>
        )}
      </div>

      <div className="nav-auth">
        {currentUser ? (
          <div className="nav-user-menu">
            {/* Profile dropdown */}
            <div className="nav-profile-wrap" ref={dropdownRef}>
              <button
                className="nav-avatar"
                onClick={() => { setDropdownOpen(v => !v); setNotifOpen(false); }}
                title={currentUser.name}
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                {getInitials(currentUser.name)}
              </button>
              {dropdownOpen && (
                <div className="nav-dropdown">
                  <div className="nav-dropdown-header">
                    <span className="nav-dropdown-name">{currentUser.name}</span>
                    <span className="nav-dropdown-sub">
                      {currentUser.role === ROLES.TEACHER
                        ? `${currentUser.subject} · ${currentUser.period}`
                        : `Roll No. ${currentUser.rollNo || '—'}`}
                    </span>
                  </div>
                  <div className="nav-dropdown-divider" />
                  <button className="nav-dropdown-item" onClick={() => go('/profile')}>
                    <User size={15} /> Profile
                  </button>
                  <button className="nav-dropdown-item" onClick={() => go('/class-info')}>
                    <Users size={15} /> Class Info
                  </button>
                  {currentUser.role !== ROLES.TEACHER && (
                    <button className="nav-dropdown-item" onClick={() => go('/records')}>
                      <ClipboardList size={15} /> My Records
                    </button>
                  )}
                  {currentUser.role === ROLES.TEACHER && (currentUser.recordTables?.length > 0) && (
                    <button className="nav-dropdown-item" onClick={() => go('/teacher-records')}>
                      <ClipboardList size={15} /> Records
                    </button>
                  )}
                  {currentUser.role !== ROLES.TEACHER && (
                    <button className="nav-dropdown-item" onClick={() => go('/holidays')}>
                      <CalendarHeart size={15} /> Holiday Homework
                    </button>
                  )}
                  {(currentUser.isAdmin || currentUser.role === ROLES.MONITOR) && (
                    <button className="nav-dropdown-item" onClick={() => go('/admin')}>
                      <ShieldAlert size={15} /> Monitor Panel
                    </button>
                  )}
                  {currentUser.role === ROLES.ADMIN && (
                    <button className="nav-dropdown-item" onClick={() => go('/admin-services')}>
                      <ShieldAlert size={15} /> Admin Services
                    </button>
                  )}
                  <button className="nav-dropdown-item" onClick={() => go('/syllabus')}>
                    <BookMarked size={15} /> Syllabus Tracker
                  </button>
                  {currentUser.role !== ROLES.TEACHER && (
                    <button className="nav-dropdown-item" onClick={() => go('/test-scores')}>
                      <BarChart2 size={15} /> Test Scores
                    </button>
                  )}
                  <button className="nav-dropdown-item" onClick={() => go('/study-together')}>
                    <GraduationCap size={15} /> Study Together
                  </button>
                  {(currentUser.role === ROLES.STAR_BATCH_EXTERNAL || currentUser.isStarBatch) && (
                    <button className="nav-dropdown-item" onClick={() => go('/star-batch')}>
                      <Star size={15} /> Starbatch Portal
                    </button>
                  )}
                  <div className="nav-dropdown-divider" />
                  <button className="nav-dropdown-item nav-dropdown-logout" onClick={() => { setDropdownOpen(false); logout(); navigate('/'); }}>
                    <LogOut size={15} /> Logout
                  </button>
                </div>
              )}
            </div>

            {/* Notification bell — right of avatar */}
            <div className="nav-notif-wrap" ref={notifRef}>
              <button
                className={`nav-bell-btn ${notifOpen ? 'active' : ''}`}
                onClick={() => {
                  localStorage.setItem(NOTIF_SEEN_KEY, Date.now().toString());
                  setHasUnread(false);
                  if (window.innerWidth < 768) { navigate('/notifications'); return; }
                  setNotifOpen(v => !v); setDropdownOpen(false);
                }}
                title="Notifications"
                aria-label="Notifications"
                style={{ position: 'relative' }}
              >
                <Bell size={18} />
                {hasUnread && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#10b981', border: '2px solid var(--surface)',
                  }} />
                )}
              </button>
              {notifOpen && (
                <div className="nav-notif-panel">
                  <div className="nav-notif-header">
                    <Bell size={15} /> Notifications
                  </div>
                  <NotificationHistory limit={3} rollNo={currentUser?.rollNo} onViewAll={() => { setNotifOpen(false); navigate('/notifications'); }} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <button className="nav-item nav-login-btn" onClick={openModal}>
            <LogIn size={20} /><span>Login</span>
          </button>
        )}
      </div>
    </nav>
  );
}
