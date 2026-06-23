import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { Home, BookOpen, CalendarHeart, CalendarRange, LogIn, LogOut, ShieldAlert, Bell, User, Users, BookMarked, BarChart2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import NotificationHistory from './NotificationHistory';

export default function Navbar() {
  const { currentUser, openModal, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
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
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={20} /><span>Dashboard</span>
        </NavLink>
        <NavLink to="/homework" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <BookOpen size={20} /><span>Homework</span>
        </NavLink>
        <NavLink to="/holidays" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CalendarHeart size={20} /><span>Holidays</span>
        </NavLink>
        <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CalendarRange size={20} /><span>Calendar</span>
        </NavLink>
        {(currentUser?.isAdmin || currentUser?.role === 'MONITOR') && (
          <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ShieldAlert size={20} /><span>Monitor Panel</span>
          </NavLink>
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
                    <span className="nav-dropdown-sub">Roll No. {currentUser.rollNo || '—'}</span>
                  </div>
                  <div className="nav-dropdown-divider" />
                  <button className="nav-dropdown-item" onClick={() => go('/profile')}>
                    <User size={15} /> Profile
                  </button>
                  <button className="nav-dropdown-item" onClick={() => go('/class-info')}>
                    <Users size={15} /> Class Info
                  </button>
                  {(currentUser.isAdmin || currentUser.role === 'MONITOR') && (
                    <button className="nav-dropdown-item" onClick={() => go('/admin')}>
                      <ShieldAlert size={15} /> Monitor Panel
                    </button>
                  )}
                  {currentUser.role === 'ADMIN' && (
                    <button className="nav-dropdown-item" onClick={() => go('/admin-services')}>
                      <ShieldAlert size={15} /> Admin Services
                    </button>
                  )}
                  <button className="nav-dropdown-item" onClick={() => go('/syllabus')}>
                    <BookMarked size={15} /> Syllabus Tracker
                  </button>
                  <button className="nav-dropdown-item" onClick={() => go('/test-scores')}>
                    <BarChart2 size={15} /> Test Scores
                  </button>
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
                  if (window.innerWidth < 768) { navigate('/notifications'); return; }
                  setNotifOpen(v => !v); setDropdownOpen(false);
                }}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={18} />
              </button>
              {notifOpen && (
                <div className="nav-notif-panel">
                  <div className="nav-notif-header">
                    <Bell size={15} /> Notifications
                  </div>
                  <NotificationHistory limit={3} onViewAll={() => { setNotifOpen(false); navigate('/notifications'); }} />
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
