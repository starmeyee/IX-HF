import { NavLink } from 'react-router-dom';
import { Home, BookOpen, CalendarHeart, GraduationCap } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <img src="/favicon.svg?v=2" alt="10th HI Logo" style={{ width: 28, height: 28 }} />
        10th HI
      </div>
      <div className="nav-links">
        <NavLink 
          to="/" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Home size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink 
          to="/homework" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <BookOpen size={20} />
          <span>Homework</span>
        </NavLink>
        <NavLink 
          to="/holidays" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <CalendarHeart size={20} />
          <span>Holidays</span>
        </NavLink>
      </div>
    </nav>
  );
}
