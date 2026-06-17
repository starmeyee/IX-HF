import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, BookOpen, CalendarDays, FlaskConical, GraduationCap, PartyPopper, Umbrella, Sun, Filter } from 'lucide-react';
import { CALENDAR_EVENTS, EVENT_TYPES } from '../data/calendarData';
import { getHomework } from '../services/homeworkService';
import { getClosedDays } from '../services/calendarOverrideService';

// homeworkByDate is now loaded from Firestore — see useEffect below.

const EVENT_ICONS = {
  HOLIDAY_VACATION: Umbrella,
  SUNDAY: Sun,
  PERIODIC_TEST: BookOpen,
  EXAMINATION: GraduationCap,
  PRE_BOARD_EXAM: FlaskConical,
  CELEBRATION: PartyPopper,
  WORKING_DAY: CalendarDays,
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// The academic year spans Apr 2026 → Mar 2027
const ACADEMIC_MONTHS = [];
for (let m = 3; m < 12; m++) ACADEMIC_MONTHS.push({ year: 2026, month: m });
for (let m = 0; m < 3;  m++) ACADEMIC_MONTHS.push({ year: 2027, month: m });

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function getEventType(dateKey) {
  return CALENDAR_EVENTS[dateKey] || 'WORKING_DAY';
}

const FILTER_OPTIONS = [
  { key: 'ALL',             label: 'All Days' },
  { key: 'HOLIDAY_VACATION',label: 'Holidays' },
  { key: 'PERIODIC_TEST',   label: 'Periodic Tests' },
  { key: 'EXAMINATION',     label: 'Examinations' },
  { key: 'PRE_BOARD_EXAM',  label: 'Pre-Board' },
  { key: 'CELEBRATION',     label: 'Celebrations' },
  { key: 'HOMEWORK',        label: 'Homework Days' },
];

export default function SchoolCalendar() {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  // Find starting month index
  const initIdx = ACADEMIC_MONTHS.findIndex(m =>
    m.year === today.getFullYear() && m.month === today.getMonth()
  );
  const [monthIdx, setMonthIdx] = useState(initIdx >= 0 ? initIdx : 0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [homeworkByDate, setHomeworkByDate] = useState({});

  // Load homework from Firestore and build date→tasks lookup
  useEffect(() => {
    getHomework().then((list) => {
      const map = {};
      list.forEach((entry) => {
        const d = new Date(entry.date);
        if (!isNaN(d)) {
          map[toDateKey(d.getFullYear(), d.getMonth(), d.getDate())] = entry.tasks;
        }
      });
      setHomeworkByDate(map);
    }).catch(console.error);
  }, []);

  const [closedDays, setClosedDaysState] = useState(new Set());
  useEffect(() => {
    getClosedDays().then((days) => setClosedDaysState(new Set(days))).catch(console.error);
  }, []);

  const { year, month } = ACADEMIC_MONTHS[monthIdx];
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Handle Android back button to close modal
  useEffect(() => {
    const handlePop = () => { if (selectedDate) setSelectedDate(null); };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [selectedDate]);

  const openDate = (dateKey) => {
    setSelectedDate(dateKey);
    window.history.pushState({ calModal: true }, '');
  };

  const closeDate = () => {
    setSelectedDate(null);
    if (window.history.state?.calModal) window.history.back();
  };

  // Check if a cell should be dimmed by filter
  const passesFilter = (dateKey) => {
    if (filter === 'ALL') return true;
    if (filter === 'HOMEWORK') return !!homeworkByDate[dateKey];
    const effective = closedDays.has(dateKey) ? 'HOLIDAY_VACATION' : getEventType(dateKey);
    return effective === filter;
  };

  // Build calendar grid
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedType = selectedDate
    ? (closedDays.has(selectedDate) ? 'HOLIDAY_VACATION' : getEventType(selectedDate))
    : null;
  const selectedTypeInfo = selectedType ? EVENT_TYPES[selectedType] : null;
  const selectedHW = selectedDate ? homeworkByDate[selectedDate] : null;
  const SelectedIcon = selectedType ? EVENT_ICONS[selectedType] : null;

  return (
    <>
      <div className="animate-fade-in fade-in-up">
        {/* ── Header ── */}
        <div className="flex-center" style={{ flexDirection: 'column', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📅</div>
          <h1 className="page-title text-gradient" style={{ marginBottom: 0 }}>School Calendar</h1>
          <p style={{ color: 'var(--text-secondary)' }}>DAV Public Schools — Academic Year 2026–27</p>
        </div>

        {/* ── Legend ── */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '0.6rem',
          justifyContent: 'center', marginBottom: '1.5rem'
        }}>
          {Object.entries(EVENT_TYPES).filter(([k]) => k !== 'WORKING_DAY').map(([key, info]) => {
            const Icon = EVENT_ICONS[key];
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: info.bg, border: `1px solid ${info.color}`,
                padding: '0.35rem 0.75rem', borderRadius: '999px',
                fontSize: '0.75rem', fontWeight: 600, color: info.text,
              }}>
                <Icon size={13} /> {info.label}
              </div>
            );
          })}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: 'rgba(0,200,83,0.12)', border: '1px solid #00C853',
            padding: '0.35rem 0.75rem', borderRadius: '999px',
            fontSize: '0.75rem', fontWeight: 600, color: '#00875a',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C853', display:'inline-block' }} />
            Homework Available
          </div>
        </div>

        {/* ── Month Nav + Filters ── */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            {/* Month navigator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setMonthIdx(i => Math.max(0, i - 1))}
                disabled={monthIdx === 0}
                style={{
                  background: 'var(--surface-hover)', border: '1px solid var(--border)',
                  borderRadius: '50%', width: 36, height: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: monthIdx === 0 ? 'not-allowed' : 'pointer',
                  opacity: monthIdx === 0 ? 0.4 : 1, transition: 'all 0.2s'
                }}
              ><ChevronLeft size={18} color="var(--text-primary)" /></button>

              <h2 style={{ fontSize: '1.35rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: 'var(--text-primary)', minWidth: 190, textAlign: 'center' }}>
                {MONTHS[month]} {year}
              </h2>

              <button
                onClick={() => setMonthIdx(i => Math.min(ACADEMIC_MONTHS.length - 1, i + 1))}
                disabled={monthIdx === ACADEMIC_MONTHS.length - 1}
                style={{
                  background: 'var(--surface-hover)', border: '1px solid var(--border)',
                  borderRadius: '50%', width: 36, height: 36,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: monthIdx === ACADEMIC_MONTHS.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: monthIdx === ACADEMIC_MONTHS.length - 1 ? 0.4 : 1, transition: 'all 0.2s'
                }}
              ><ChevronRight size={18} color="var(--text-primary)" /></button>
            </div>

            {/* Today + Filter buttons */}
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => {
                const ti = ACADEMIC_MONTHS.findIndex(m => m.year === today.getFullYear() && m.month === today.getMonth());
                if (ti >= 0) setMonthIdx(ti);
              }} style={{
                background: 'var(--surface-hover)', border: '1px solid var(--border)',
                padding: '0.45rem 1rem', borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)'
              }}>Today</button>

              <button onClick={() => setShowFilters(s => !s)} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: showFilters ? 'var(--primary, #6366f1)' : 'var(--surface-hover)',
                color: showFilters ? '#fff' : 'var(--text-primary)',
                border: '1px solid var(--border)',
                padding: '0.45rem 1rem', borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
              }}><Filter size={14} /> Filters</button>
            </div>
          </div>

          {/* Filter chips */}
          {showFilters && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              {FILTER_OPTIONS.map(opt => (
                <button key={opt.key} onClick={() => setFilter(opt.key)} style={{
                  padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: filter === opt.key ? 'var(--primary, #6366f1)' : 'var(--surface-hover)',
                  color: filter === opt.key ? '#fff' : 'var(--text-secondary)',
                  border: filter === opt.key ? '1px solid var(--primary, #6366f1)' : '1px solid var(--border)',
                }}>{opt.label}</button>
              ))}
            </div>
          )}
        </div>

        {/* ── Calendar Grid ── */}
        <div className="glass-card" style={{ padding: '1.25rem', overflow: 'hidden' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
            {DAYS.map(d => (
              <div key={d} style={{
                textAlign: 'center', fontSize: '0.72rem', fontWeight: 700,
                color: d === 'Sun' ? '#e57373' : 'var(--text-secondary)',
                padding: '0.4rem 0', textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>{d}</div>
            ))}
          </div>

          {/* Date cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const dateKey = toDateKey(year, month, day);
              const evType = closedDays.has(dateKey) ? 'HOLIDAY_VACATION' : getEventType(dateKey);
              const evInfo = EVENT_TYPES[evType];
              const hasHW = !!homeworkByDate[dateKey];
              const isToday = dateKey === todayKey;
              const dimmed = filter !== 'ALL' && !passesFilter(dateKey);
              const Icon = EVENT_ICONS[evType];

              return (
                <button
                  key={dateKey}
                  onClick={() => openDate(dateKey)}
                  style={{
                    position: 'relative',
                    minHeight: 56,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 2,
                    background: isToday
                      ? 'var(--primary, #6366f1)'
                      : dimmed
                        ? 'transparent'
                        : evInfo.bg,
                    border: isToday
                      ? '2px solid var(--primary, #6366f1)'
                      : `1px solid ${dimmed ? 'var(--border)' : evInfo.color + '55'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    opacity: dimmed ? 0.3 : 1,
                    transition: 'all 0.18s ease',
                    padding: '4px 2px',
                  }}
                  onMouseEnter={e => { if (!isToday) e.currentTarget.style.transform = 'scale(1.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {/* Day number */}
                  <span style={{
                    fontSize: '0.88rem', fontWeight: isToday ? 700 : 600,
                    color: isToday ? '#fff' : evInfo.text,
                    lineHeight: 1,
                  }}>{day}</span>

                  {/* Event icon (tiny) */}
                  {evType !== 'WORKING_DAY' && !isToday && (
                    <Icon size={10} color={evInfo.color} />
                  )}

                  {/* Homework green dot */}
                  {hasHW && (
                    <span style={{
                      position: 'absolute', bottom: 4, right: 5,
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#00C853',
                      boxShadow: '0 0 4px #00C853aa'
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Month quick-jump ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          {ACADEMIC_MONTHS.map((am, i) => (
            <button key={i} onClick={() => setMonthIdx(i)} style={{
              padding: '0.3rem 0.8rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
              background: monthIdx === i ? 'var(--primary, #6366f1)' : 'var(--surface-hover)',
              color: monthIdx === i ? '#fff' : 'var(--text-secondary)',
              border: monthIdx === i ? '1px solid var(--primary, #6366f1)' : '1px solid var(--border)',
            }}>{MONTHS[am.month].slice(0, 3)} {String(am.year).slice(2)}</button>
          ))}
        </div>
      </div>

      {/* ── Date Detail Modal ── */}
      {selectedDate && (
        <div
          onClick={closeDate}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1.25rem',
            animation: 'fadeIn 0.18s ease'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '1.75rem',
              maxWidth: 520, width: '100%', position: 'relative',
              maxHeight: '88vh', overflowY: 'auto',
              borderTop: `4px solid ${selectedTypeInfo?.color || 'var(--tertiary)'}`,
              boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
              animation: 'slideUp 0.2s ease',
            }}
          >
            {/* Close */}
            <button
              onClick={closeDate}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'var(--surface-hover)', border: '1px solid var(--border)',
                borderRadius: '50%', width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-primary)',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            ><X size={16} /></button>

            {/* Date heading */}
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' })}
              </p>
              <h2 style={{ fontSize: '1.6rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </h2>
            </div>

            {/* Event badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: selectedTypeInfo?.bg, border: `1px solid ${selectedTypeInfo?.color}`,
              padding: '0.5rem 1rem', borderRadius: '999px',
              fontSize: '0.85rem', fontWeight: 700, color: selectedTypeInfo?.text,
              marginBottom: '1.5rem',
            }}>
              {SelectedIcon && <SelectedIcon size={15} />}
              {selectedTypeInfo?.label}
            </div>

            {/* Homework section */}
            {selectedHW ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C853', flexShrink: 0 }} />
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#00875a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Homework ({selectedHW.length} task{selectedHW.length > 1 ? 's' : ''})
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {selectedHW.map((task, idx) => (
                    <div key={idx} style={{
                      background: 'var(--surface-hover)', border: '1px solid var(--border)',
                      borderLeft: '3px solid var(--tertiary)', borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem 1rem',
                    }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--tertiary)', display: 'block', marginBottom: '0.2rem' }}>
                        {task.subject}
                      </span>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                        {task.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                background: 'var(--surface-hover)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '1rem',
                textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem'
              }}>
                No homework recorded for this date.
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </>
  );
}
