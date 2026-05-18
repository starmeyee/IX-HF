import React, { useState } from 'react';
import { Users, UserCircle, ShieldCheck, Copy, Check, BookOpen, CalendarDays, ClipboardList, Hourglass } from 'lucide-react';
import { homeworkData } from '../data/homeworkData';

const studentsData = [
  "Aditya Gupta", "Shreya", "Shourya", "Mihika", "Anuraj", "Parth", "Ravi", "Ruchir", "Sonali", "Yesh", 
  "Isha", "Ayush", "Aman Kishor", "KIRTI", "Suryanahu", "Mohit", "Virat Singh", "Rudransh", "Sushant", "Arnav", 
  "Deepanshu", "Anshuka", "Utkarsh", "Vibhav", "Aadarsh", "Sahil", "Ayush Kumar", "Awni", "Aditya Prakash", "Abhigyan", 
  "Anushka", "Shivam", "Chirag", "Khushi", "Pratyaksh", "Rahul", "Manshi", "Shivansh", "Abhishek", "Utkarsh Bhardwaj"
];

const students = studentsData.map((name, i) => ({
  rollNo: i + 1,
  name
}));

const monitors = ["Utkarsh", "Pratyaksh", "Aditya", "Sonali", "Manshi"];

const routine = [
  { day: 'Mon', periods: ['Hindi', 'Physics', 'IT', 'Civics', 'Maths', 'English'] },
  { day: 'Tue', periods: ['Hindi', 'Physics', 'IT', 'Civics', 'Maths', 'English'] },
  { day: 'Wed', periods: ['Hindi', 'Physics', 'Sports', 'History', 'Maths', 'Economics'] },
  { day: 'Thu', periods: ['IT', 'Chemistry', 'Biology', 'History', 'Maths', 'Economics'] },
  { day: 'Fri', periods: ['Hindi', 'Chemistry', 'Biology', 'Geography', 'Maths', 'English'] },
  { day: 'Sat', periods: ['Hindi', 'Chemistry', 'Biology', 'Geography', 'Maths', 'English'] },
];

export default function Home() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = students.map(s => `${s.rollNo}. ${s.name}`).join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Session stats ──────────────────────────────────────────
  const SESSION_START = new Date('2026-04-16');
  const VACATION_DATE = new Date('2026-06-22');
  const today         = new Date();

  const calendarDaysElapsed = Math.floor((today - SESSION_START) / (1000 * 60 * 60 * 24));
  const classDaysHeld       = homeworkData.length;                         // one entry per class day
  const totalTasks          = homeworkData.reduce((acc, d) => acc + d.tasks.length, 0);
  const daysToVacation      = Math.max(0, Math.floor((VACATION_DATE - today) / (1000 * 60 * 60 * 24)));
  // ───────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in fade-in-up">
      <header className="page-header">
        <h1 className="page-title text-gradient">10th HI Overview</h1>
        <p className="page-subtitle">Welcome to the portal for class 10th HI</p>
      </header>

      {/* ── Session Stats ── */}
      <div className="bento-grid mb-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Class Days */}
        <div className="glass-card glow-hover" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--tertiary)' }}>
            <BookOpen size={20} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Class Days Held</span>
          </div>
          <p style={{ fontSize: '2.2rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', lineHeight: 1 }}>{classDaysHeld}</p>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>since 16 April</span>
        </div>

        {/* Calendar Days Elapsed */}
        <div className="glass-card glow-hover" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CalendarDays size={20} color="var(--primary, #6366f1)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Days in Session</span>
          </div>
          <p style={{ fontSize: '2.2rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', lineHeight: 1 }}>{calendarDaysElapsed}</p>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>calendar days elapsed</span>
        </div>

        {/* Total Homework Tasks */}
        <div className="glass-card glow-hover" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ClipboardList size={20} color="#f59e0b" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Total HW Tasks</span>
          </div>
          <p style={{ fontSize: '2.2rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', lineHeight: 1 }}>{totalTasks}</p>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>across all class days</span>
        </div>

        {/* Days to Vacation */}
        <div className="glass-card glow-hover" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Hourglass size={20} color="#10b981" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Days to Vacation</span>
          </div>
          <p style={{ fontSize: '2.2rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: daysToVacation <= 7 ? '#10b981' : 'var(--text-primary)', lineHeight: 1 }}>{daysToVacation}</p>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>till 22 June 2026</span>
        </div>
      </div>
      {/* ── End Session Stats ── */}

      <div className="bento-grid mb-2">
        <div className="bento-item glass-card stat-card glow-hover">
          <div className="stat-icon primary-grad">
            <UserCircle size={32} />
          </div>
          <div className="stat-info">
            <h3>Class Teacher</h3>
            <p>Abhay Sinha</p>
          </div>
        </div>
        
        <div className="bento-item glass-card stat-card glow-hover">
          <div className="stat-icon secondary-grad">
            <Users size={32} />
          </div>
          <div className="stat-info">
            <h3>Total Students</h3>
            <p>{students.length}</p>
          </div>
        </div>

        <div className="bento-item glass-card glow-hover col-span-2">
          <div className="monitor-header">
            <div className="stat-icon tertiary-grad" style={{ width: 40, height: 40, borderRadius: 8 }}>
              <ShieldCheck size={20} />
            </div>
            <h3>Class Monitors</h3>
          </div>
          <div className="monitor-tags">
            {monitors.map(m => (
              <span key={m} className="monitor-badge">{m}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="bento-section">
        <h2 className="section-title">Weekly Routine</h2>
        <div className="glass-card table-card p-0 glow-hover">
          <div className="routine-grid-real">
            <div className="routine-cell header">Day</div>
            <div className="routine-cell header">1st</div>
            <div className="routine-cell header">2nd</div>
            <div className="routine-cell header">3rd</div>
            <div className="routine-cell header">4th</div>
            <div className="routine-cell header">5th</div>
            <div className="routine-cell header">6th</div>
            
            {routine.map((row) => (
              <React.Fragment key={row.day}>
                <div className="routine-cell header day-label">{row.day}</div>
                {row.periods.map((subject, index) => (
                  <div key={index} className="routine-cell subject">
                    {subject}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="bento-section mt-2">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>Student Register</h2>
          <button 
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: copied ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-hover)',
              color: copied ? '#10b981' : 'var(--text-primary)',
              border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s ease',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy List (.txt format)'}
          </button>
        </div>
        <div className="glass-card table-card glow-hover">
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Student Name</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.rollNo}>
                    <td>
                      <span className="roll-badge">{student.rollNo}</span>
                    </td>
                    <td className="student-name">{student.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
