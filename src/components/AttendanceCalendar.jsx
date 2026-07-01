import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import {
  isWorkingDay,
  toDateKey,
  fromDateKey,
  todayKey,
  SESSION_START,
} from '../data/attendanceUtils';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['S','M','T','W','T','F','S'];

// Academic year spans Apr 2026 → Mar 2027.
const ACADEMIC_MONTHS = [];
for (let m = 3; m < 12; m++) ACADEMIC_MONTHS.push({ year: 2026, month: m });
for (let m = 0; m < 3; m++) ACADEMIC_MONTHS.push({ year: 2027, month: m });

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstWeekday(year, month) {
  return new Date(year, month, 1).getDay();
}

/**
 * Interactive attendance calendar.
 * - Only working days within [SESSION_START, today] are toggleable.
 * - Working days default to "present"; tapping marks "absent".
 * - Future working days and non-working days are shown disabled.
 *
 * @param {string[]} absentDays - array of absent date keys
 * @param {(key:string)=>void} onToggle - called when a day is toggled
 */
export default function AttendanceCalendar({ absentDays = [], onToggle, closedDays = [], onMonthStatsChange }) {
  const today = todayKey();

  const closedSet = useMemo(() => new Set(closedDays), [closedDays]);
  const sessionStartIdx = useMemo(() => {
    const start = fromDateKey(SESSION_START);
    return ACADEMIC_MONTHS.findIndex(
      (m) => m.year === start.getFullYear() && m.month === start.getMonth()
    );
  }, []);

  const initialIdx = useMemo(() => {
    const now = new Date();
    const idx = ACADEMIC_MONTHS.findIndex(
      (m) => m.year === now.getFullYear() && m.month === now.getMonth()
    );
    return idx >= 0 ? idx : Math.max(0, sessionStartIdx);
  }, [sessionStartIdx]);

  const [viewIdx, setViewIdx] = useState(initialIdx);
  const { year, month } = ACADEMIC_MONTHS[viewIdx];

  const absentSet = useMemo(() => new Set(absentDays), [absentDays]);

  // Per-month stats for the summary strip.
  const monthStats = useMemo(() => {
    const days = getDaysInMonth(year, month);
    let working = 0, absent = 0;
    for (let d = 1; d <= days; d++) {
      const key = toDateKey(year, month, d);
      if (key > today || key < SESSION_START) continue;
      if (!isWorkingDay(key, closedSet)) continue;
      working++;
      if (absentSet.has(key)) absent++;
    }
    const present = working - absent;
    const percentage = working === 0 ? 100 : Math.round((present / working) * 100);
    return { working, present, absent, percentage };
  }, [year, month, absentSet, today, closedSet]);

  useEffect(() => {
    onMonthStatsChange?.(monthStats);
  }, [monthStats, onMonthStatsChange]);


  const daysInMonth = getDaysInMonth(year, month);
  const firstWeekday = getFirstWeekday(year, month);
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function dayState(day) {
    const key = toDateKey(year, month, day);
    const working = isWorkingDay(key, closedSet);
    const isFuture = key > today;
    const isBeforeSession = key < SESSION_START;
    const isToday = key === today;
    const isAbsent = absentSet.has(key);
    const toggleable = working && !isFuture && !isBeforeSession;
    return { key, working, isFuture, isBeforeSession, isToday, isAbsent, toggleable };
  }

  function handleClick(day) {
    const { key, toggleable } = dayState(day);
    if (!toggleable) return;
    onToggle?.(key);
  }

  const canGoPrev = viewIdx > 0;
  const canGoNext = viewIdx < ACADEMIC_MONTHS.length - 1;

  return (
    <div className="attendance-calendar">
      <div className="att-cal-header">
        <button
          className="att-cal-nav"
          onClick={() => canGoPrev && setViewIdx((i) => i - 1)}
          disabled={!canGoPrev}
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="att-cal-title">{MONTHS[month]} {year}</h3>
        <button
          className="att-cal-nav"
          onClick={() => canGoNext && setViewIdx((i) => i + 1)}
          disabled={!canGoNext}
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Month summary strip */}
      <div className="att-cal-summary">
        <div className="att-summary-item present">
          <span className="att-summary-num">{monthStats.present}</span>
          <span className="att-summary-lbl">Present</span>
        </div>
        <div className="att-summary-item absent">
          <span className="att-summary-num">{monthStats.absent}</span>
          <span className="att-summary-lbl">Absent</span>
        </div>
        <div className="att-summary-item working">
          <span className="att-summary-num">{monthStats.working}</span>
          <span className="att-summary-lbl">Working days</span>
        </div>
      </div>

      <div className="att-cal-weekdays">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="att-cal-weekday">{d}</div>
        ))}
      </div>

      <div className="att-cal-grid">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="att-cal-cell empty" />;
          const s = dayState(day);

          let cls = 'att-cal-cell';
          if (!s.working) cls += ' non-working';
          else if (s.isBeforeSession) cls += ' pre-session';
          else if (s.isFuture) cls += ' future';
          else if (s.isAbsent) cls += ' absent';
          else cls += ' present';
          if (s.isToday) cls += ' today';
          if (s.toggleable) cls += ' toggleable';

          return (
            <button
              key={s.key}
              className={cls}
              onClick={() => handleClick(day)}
              disabled={!s.toggleable}
              aria-pressed={s.isAbsent}
              title={
                !s.working ? 'School closed'
                : s.isBeforeSession ? 'Before session start'
                : s.isFuture ? 'Upcoming working day'
                : s.isAbsent ? 'Marked absent — tap to mark present'
                : 'Present — tap to mark absent'
              }
            >
              <span className="att-cal-num">{day}</span>
            </button>
          );
        })}
      </div>

      <div className="att-cal-legend">
        <span className="att-legend-item"><span className="att-dot present" /> Present</span>
        <span className="att-legend-item"><span className="att-dot absent" /> Absent</span>
        <span className="att-legend-item"><span className="att-dot non-working" /> Closed</span>
        <span className="att-legend-item"><span className="att-dot today-dot" /> Today</span>
      </div>
      <p className="att-cal-hint">
        <Info size={13} /> Tap any working day you missed to mark yourself absent.
      </p>
    </div>
  );
}
