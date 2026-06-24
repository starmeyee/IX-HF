import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { CalendarCheck, BookOpen, TrendingUp, LogIn, ClipboardCheck, ArrowRight, Check, BookMarked, ClipboardList, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roles';
import TeacherDashboard from './TeacherDashboard';
import AttendanceCalendar from '../components/AttendanceCalendar';
import NoticeBar from '../components/NoticeBar';
import SyllabusProgressBar from '../components/SyllabusProgressBar';
import { getAttendance, setAttendance, getHolidayHomework, getHomeworkDone, setHomeworkDone, getCheckedTopics } from '../auth/authService';
import MergeBanner from '../components/MergeBanner';
import MarksBanner from '../components/MarksBanner';
import { getHomework } from '../services/homeworkService';
import { getClosedDays } from '../services/calendarOverrideService';
import { getSyllabus, getCompletedTopics } from '../services/syllabusService';
import { getAllClasswork } from '../services/classworkService';
import { allTopics, statsForTopics, toSets } from '../data/syllabusStats';
import { calcAttendance, todayKey, toDateKey } from '../data/attendanceUtils';
import { holidayData } from '../data/holidayData';

// Build total checkable holiday homework items (same logic as HolidayHomework page)
function buildHolidayTotal() {
  let total = 0;
  holidayData.forEach((task) => {
    total += task.files && task.files.length > 1 ? task.files.length : 1;
  });
  return total;
}
const HOLIDAY_TOTAL = buildHolidayTotal();

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function homeworkDateKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

function WelcomeLanding({ onLogin }) {
  return (
    <div className="welcome-landing animate-fade-in fade-in-up">
      <h1 className="text-gradient">Welcome to 10th HI</h1>
      <p>Your class portal for homework, attendance, holiday assignments, and important notices — all in one place.</p>
      <button className="auth-btn primary" onClick={onLogin} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
        <LogIn size={18} /> Login to continue
      </button>
    </div>
  );
}

export default function StudentDashboard() {
  const { currentUser, openModal } = useAuth();
  const navigate = useNavigate();
  const attendancePanelRef = useRef(null);

  const [absentDays, setAbsentDays] = useState([]);
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);
  const [closedDays, setClosedDays] = useState([]);
  const [emailReminderDismissed, setEmailReminderDismissed] = useState(
    () => !!sessionStorage.getItem('email_reminder_dismissed')
  );

  // Latest homework entry (today or last working day that has data)
  const [latestHw, setLatestHw] = useState(null); // { date, tasks[] }
  const [hwLoading, setHwLoading] = useState(true);

  // Latest classwork record (most recent day with recorded periods)
  const [latestClasswork, setLatestClasswork] = useState(null);
  const [cwLoading, setCwLoading] = useState(true);

  // Holiday homework completion count
  const [holidayCompleted, setHolidayCompleted] = useState(null);

  // Daily homework completion keys
  const [doneKeys, setDoneKeys] = useState(new Set());

  // Syllabus global progress { completedPct, checkedPct } | null while loading
  const [syllabusStats, setSyllabusStats] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    Promise.all([
      getSyllabus(),
      getCompletedTopics(),
      getCheckedTopics(currentUser.phone),
    ])
      .then(([sections, completedList, checkedList]) => {
        if (!active) return;
        const { completedSet, checkedSet } = toSets(completedList, checkedList);
        const stats = statsForTopics(allTopics(sections), completedSet, checkedSet);
        setSyllabusStats(stats);
      })
      .catch((err) => { console.error(err); if (active) setSyllabusStats({ completedPct: 0, checkedPct: 0 }); });
    return () => { active = false; };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    getAttendance(currentUser.phone)
      .then((days) => { if (active) setAbsentDays(days); })
      .catch(console.error)
      .finally(() => { if (active) setAttendanceLoaded(true); });
    return () => { active = false; };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    getClosedDays()
      .then((days) => { if (active) setClosedDays(days); })
      .catch(console.error);
    return () => { active = false; };
  }, [currentUser]);

  // Load latest homework: prefer today, fall back to most recent past entry.
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    const tKey = todayKey();
    getHomework()
      .then((list) => {
        if (!active) return;
        // list is ordered desc by timestamp from Firestore
        const todayEntry = list.find((hw) => homeworkDateKey(hw.date) === tKey);
        if (active) setLatestHw(todayEntry || list[0] || null);
      })
      .catch(console.error)
      .finally(() => { if (active) setHwLoading(false); });
    return () => { active = false; };
  }, [currentUser]);

  // Load latest classwork (most recent day with recorded periods).
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    getAllClasswork()
      .then((list) => { if (active) setLatestClasswork(list[0] || null); })
      .catch(console.error)
      .finally(() => { if (active) setCwLoading(false); });
    return () => { active = false; };
  }, [currentUser]);

  // Load holiday homework completion count
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    getHolidayHomework(currentUser.phone)
      .then((keys) => { if (active) setHolidayCompleted(keys.length); })
      .catch(() => { if (active) setHolidayCompleted(0); });
    return () => { active = false; };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    getHomeworkDone(currentUser.phone)
      .then((keys) => { if (active) setDoneKeys(new Set(keys)); })
      .catch(console.error);
    return () => { active = false; };
  }, [currentUser]);

  const toggleTask = useCallback((taskKey) => {
    if (!currentUser) return;
    setDoneKeys((prev) => {
      const next = new Set(prev);
      next.has(taskKey) ? next.delete(taskKey) : next.add(taskKey);
      setHomeworkDone(currentUser.phone, Array.from(next)).catch(console.error);
      return next;
    });
  }, [currentUser]);

  const stats = useMemo(() => calcAttendance(absentDays, undefined, closedDays), [absentDays, closedDays]);

  const handleToggle = useCallback((key) => {
    if (!currentUser) return;
    setAbsentDays((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      setAttendance(currentUser.phone, next).catch(console.error);
      return next;
    });
  }, [currentUser]);

  function scrollToAttendance() {
    attendancePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (!currentUser) {
    return <WelcomeLanding onLogin={openModal} />;
  }

  if (currentUser.role === ROLES.TEACHER) {
    return <TeacherDashboard />;
  }

  const firstName = currentUser.name.split(' ')[0];
  const displayPct = stats.monthlyAveragePercentage;
  const pctClass = displayPct >= 75 ? 'att-pct-good' : displayPct >= 60 ? 'att-pct-warn' : 'att-pct-bad';

  const tKey = todayKey();
  const isLatestToday = latestHw && homeworkDateKey(latestHw.date) === tKey;
  const hwPct = holidayCompleted !== null ? Math.round((holidayCompleted / HOLIDAY_TOTAL) * 100) : null;

  return (
    <div className="dashboard animate-fade-in fade-in-up">
      <header className="dash-greeting">
        <h1>{greeting()}, <span className="text-gradient">{firstName}</span> 👋</h1>
        <p>Here's your day at a glance.</p>
      </header>

      {/* Quick stats */}
      <div className="dash-stats-row">
        <div className="glass-card dash-stat glow-hover" data-tour="attendance-stat">
          <span className="dash-stat-label"><TrendingUp size={16} /> Attendance</span>
          <span className={`dash-stat-value ${pctClass}`}>
            {attendanceLoaded ? `${displayPct}%` : '…'}
          </span>
          <span className="dash-stat-sub">{stats.presentDays}/{stats.totalDays} working days · monthly avg</span>
        </div>

        {/* Days Absent — scrolls to calendar, not navigate */}
        <div
          className="glass-card dash-stat glow-hover"
          style={{ cursor: 'pointer' }}
          onClick={scrollToAttendance}
          title="Click to view your attendance calendar"
        >
          <span className="dash-stat-label"><CalendarCheck size={16} /> Days Absent</span>
          <span className="dash-stat-value">{attendanceLoaded ? stats.absentDays : '…'}</span>
          <span className="dash-stat-sub" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            View calendar <ArrowRight size={12} />
          </span>
        </div>

        {/* Holiday homework progress */}
        <div
          className="glass-card dash-stat glow-hover"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/holidays')}
          title="View holiday homework"
        >
          <span className="dash-stat-label"><ClipboardCheck size={16} /> Holiday HW</span>
          <span className="dash-stat-value" style={{ color: hwPct === 100 ? 'var(--tertiary)' : 'var(--text-primary)' }}>
            {holidayCompleted !== null ? `${holidayCompleted}/${HOLIDAY_TOTAL}` : '…'}
          </span>
          <span className="dash-stat-sub">
            {hwPct !== null ? (hwPct === 100 ? 'All done! 🎉' : `${hwPct}% completed`) : 'checking…'}
          </span>
        </div>
      </div>

      {/* Notices */}
      <MarksBanner />
      <MergeBanner />
      <NoticeBar />

      {/* Recovery email reminder */}
      {!currentUser.email && !emailReminderDismissed && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
          background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <Mail size={15} color="var(--primary)" />
            Add a recovery email to reset your password if you ever forget it.
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button className="auth-btn primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
              onClick={() => navigate('/profile')}>
              Add Email
            </button>
            <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}
              onClick={() => { sessionStorage.setItem('email_reminder_dismissed', '1'); setEmailReminderDismissed(true); }}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Syllabus progress summary */}
      <div
        className="glass-card glow-hover"
        data-tour="syllabus-card"
        style={{ cursor: 'pointer' }}
        onClick={() => navigate('/syllabus')}
        title="View full syllabus progress"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h2 className="section-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookMarked size={20} color="var(--primary)" />
            Syllabus Progress
          </h2>
          <span className="auth-link" style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            View syllabus <ArrowRight size={13} />
          </span>
        </div>
        {syllabusStats === null ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</p>
        ) : (
          <SyllabusProgressBar
            completed={syllabusStats.completedPct}
            checked={syllabusStats.checkedPct}
            sublabel={`${syllabusStats.completed}/${syllabusStats.total} topics`}
            showLegend
          />
        )}
      </div>

      {/* Today's / Latest homework card */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h2 className="section-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={20} color="var(--primary)" />
            {isLatestToday ? "Today's Homework" : 'Latest Homework'}
          </h2>
          <button
            className="auth-link"
            onClick={() => navigate('/homework')}
            style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            View all <ArrowRight size={13} />
          </button>
        </div>

        {hwLoading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</p>
        ) : !latestHw ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No homework entries yet.</p>
        ) : (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              {latestHw.date}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {(!latestHw.tasks || latestHw.tasks.length === 0) ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No tasks recorded.</p>
              ) : latestHw.tasks.map((task, idx) => {
                const key = `${latestHw.id}_${idx}`;
                const done = doneKeys.has(key);
                return (
                  <button key={idx} onClick={() => toggleTask(key)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                    <div style={{
                      padding: '0.7rem 0.9rem',
                      background: done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: `3px solid ${done ? '#10b981' : 'var(--primary)'}`,
                      display: 'flex', gap: '0.65rem', alignItems: 'flex-start',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{
                        flexShrink: 0, marginTop: 2,
                        width: 18, height: 18, borderRadius: 5,
                        border: `2px solid ${done ? '#10b981' : 'var(--border)'}`,
                        background: done ? '#10b981' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}>
                        {done && <Check size={11} color="#fff" strokeWidth={3} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.2rem', color: done ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none', margin: 0 }}>
                          {task.subject}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Latest classwork card */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h2 className="section-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={20} color="#FF6D00" />
            Latest Classwork
          </h2>
          <button
            className="auth-link"
            onClick={() => navigate('/homework?tab=classwork')}
            style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            View all <ArrowRight size={13} />
          </button>
        </div>

        {cwLoading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</p>
        ) : !latestClasswork ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No classwork recorded yet.</p>
        ) : (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              {latestClasswork.weekday}, {new Date(latestClasswork.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {(!latestClasswork.periods || latestClasswork.periods.length === 0) ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No periods recorded.</p>
              ) : latestClasswork.periods.map((p, idx) => (
                <div key={idx} style={{
                  padding: '0.7rem 0.9rem',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid #FF6D00',
                }}>
                  <p style={{ fontWeight: 600, fontSize: '0.85rem', margin: 0, marginBottom: '0.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#FF6D00' }}>{p.period}</span> {p.subject}
                  </p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>
                    {p.note}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Attendance tracker */}
      <div className="glass-card" data-tour="attendance-panel" ref={attendancePanelRef}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>My Attendance</h2>
          <span className={`dash-stat-value ${pctClass}`} style={{ fontSize: '1.5rem' }}>
            {attendanceLoaded ? `${displayPct}%` : '…'}
          </span>
        </div>
        <AttendanceCalendar absentDays={absentDays} onToggle={handleToggle} closedDays={closedDays} />
      </div>
    </div>
  );
}
