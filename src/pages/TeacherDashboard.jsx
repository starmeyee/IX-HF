import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowRight, BarChart2, Wrench, CalendarRange } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import NoticeBar from '../components/NoticeBar';
import ClassInfo from '../components/ClassInfo';
import { getAllUsers } from '../services/adminService';
import { getAttendance } from '../auth/authService';
import { getClosedDays } from '../services/calendarOverrideService';
import { calcAttendance } from '../data/attendanceUtils';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TeacherDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [classAvgAtt, setClassAvgAtt] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([getAllUsers(), getClosedDays()])
      .then(async ([users, closed]) => {
        if (!active) return;
        const students = users.filter(u => u.rollNo && u.rollNo > 0 && u.phone);
        if (!students.length) { setClassAvgAtt(null); return; }
        const attendances = await Promise.all(
          students.map(u => getAttendance(u.phone).catch(() => []))
        );
        const pcts = attendances.map(absent =>
          calcAttendance(absent, undefined, closed).percentage
        );
        const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
        if (active) setClassAvgAtt(avg);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!currentUser) return null;

  return (
    <div className="dashboard animate-fade-in fade-in-up">

      {/* Greeting */}
      <header className="dash-greeting">
        <h1>
          {greeting()},{' '}
          <span className="text-gradient">{currentUser.name}</span> 👋
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
          <span className="teacher-chip">{currentUser.subject}</span>
          <span className="teacher-chip">{currentUser.period}</span>
        </div>
      </header>

      {/* Stats row */}
      <div className="dash-stats-row">
        <div className="glass-card dash-stat glow-hover">
          <span className="dash-stat-label"><Users size={16} /> Class Avg Attendance</span>
          <span className={`dash-stat-value ${classAvgAtt !== null ? (classAvgAtt >= 75 ? 'att-pct-good' : classAvgAtt >= 60 ? 'att-pct-warn' : 'att-pct-bad') : ''}`}>
            {classAvgAtt !== null ? `${classAvgAtt}%` : '…'}
          </span>
          <span className="dash-stat-sub">monthly average across all students</span>
        </div>
        <div className="glass-card dash-stat glow-hover" style={{ cursor: 'pointer' }} onClick={() => navigate('/maths')}>
          <span className="dash-stat-label"><BarChart2 size={16} /> Maths Dashboard</span>
          <span className="dash-stat-value" style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>View Scores</span>
          <span className="dash-stat-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            Test 1 &amp; Test 2 <ArrowRight size={12} />
          </span>
        </div>
      </div>

      {/* Notice bar */}
      <NoticeBar />

      {/* Quick link to Teacher Tools */}
      <div className="glass-card glow-hover" style={{ cursor: 'pointer' }} onClick={() => navigate('/teacher-tools')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 600, fontSize: '0.95rem' }}>
            <Wrench size={18} color="var(--primary)" /> Teacher Tools
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.82rem', flexShrink: 0 }}>
            Notices &amp; more <ArrowRight size={13} />
          </span>
        </div>
      </div>

      {/* Class Info */}
      <div className="glass-card">
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <CalendarRange size={20} color="var(--primary)" /> Class Info
        </h2>
        <ClassInfo />
      </div>

    </div>
  );
}
