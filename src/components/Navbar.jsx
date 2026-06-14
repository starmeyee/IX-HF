import { NavLink, useNavigate } from 'react-router-dom';
import { Home, BookOpen, CalendarHeart, CalendarRange, LogIn, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function Navbar() {
  const { currentUser, openModal, logout } = useAuth();
  const navigate = useNavigate();

  function getInitials(name) {
    const parts = name.trim().split(' ');
    return parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0];
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
        {currentUser?.isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <ShieldAlert size={20} /><span>Admin</span>
          </NavLink>
        )}
      </div>

      <div className="nav-auth">
        {currentUser ? (
          <div className="nav-user-menu">
            <button className="nav-avatar" onClick={() => navigate('/profile')} title={currentUser.name}>
              {getInitials(currentUser.name).toUpperCase()}
            </button>
            <button className="nav-item nav-logout" onClick={logout} title="Logout">
              <LogOut size={18} />
            </button>
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
