import { CALENDAR_EVENTS } from './calendarData';

// ── Configuration ──────────────────────────────────────────────
// The academic session begins on this date. Attendance is counted
// from here up to (and including) the current day.
export const SESSION_START = '2026-04-09';

// Last day of the academic session (used for full-year projections).
export const SESSION_END = '2027-03-31';

// Event types that mean school is CLOSED → not counted for attendance.
const NON_WORKING_EVENT_TYPES = new Set(['SUNDAY', 'HOLIDAY_VACATION']);

// ── Date helpers (all local-time, IST-safe) ────────────────────
// We deliberately avoid toISOString() because it converts to UTC and
// shifts the date back by one day in IST (UTC+5:30).

/**
 * Format a date into a local "YYYY-MM-DD" key.
 * Accepts either a Date object: toDateKey(date)
 * or numeric parts (0-indexed month): toDateKey(year, month, day)
 */
export function toDateKey(yearOrDate, month, day) {
  let y, m, d;
  if (yearOrDate instanceof Date) {
    y = yearOrDate.getFullYear();
    m = yearOrDate.getMonth();
    d = yearOrDate.getDate();
  } else {
    y = yearOrDate;
    m = month;
    d = day;
  }
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Parse a "YYYY-MM-DD" key into a local Date at midnight. */
export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Today's date key (local). */
export function todayKey() {
  return toDateKey(new Date());
}

// ── Working-day logic ──────────────────────────────────────────

/**
 * Normalizes a closedDays argument (array or Set) into a Set for fast
 * lookups. Returns an empty Set if nothing is provided.
 */
function toClosedSet(closedDays) {
  if (!closedDays) return EMPTY_SET;
  return closedDays instanceof Set ? closedDays : new Set(closedDays);
}
const EMPTY_SET = new Set();

/**
 * A working day is any calendar date that is NOT a Sunday, NOT a
 * holiday/vacation, and NOT an admin-declared closed day. Exams,
 * periodic tests, and celebrations count as school-open days unless
 * the admin overrides them via `closedDays`.
 *
 * @param {string} dateKey - "YYYY-MM-DD"
 * @param {Set<string>|string[]} [closedDays] - admin-declared closures
 */
export function isWorkingDay(dateKey, closedDays) {
  const closed = toClosedSet(closedDays);
  if (closed.has(dateKey)) return false;
  const eventType = CALENDAR_EVENTS[dateKey];
  if (eventType && NON_WORKING_EVENT_TYPES.has(eventType)) return false;
  // Fallback: treat any actual Sunday as non-working.
  if (fromDateKey(dateKey).getDay() === 0) return false;
  return true;
}

/**
 * Returns a sorted array of working-day date keys in the inclusive
 * range [startKey, endKey], excluding admin-declared closed days.
 *
 * @param {string} startKey - "YYYY-MM-DD" (defaults to SESSION_START)
 * @param {string} endKey   - "YYYY-MM-DD" (defaults to today)
 * @param {Set<string>|string[]} [closedDays] - admin-declared closures
 */
export function getWorkingDays(startKey = SESSION_START, endKey = todayKey(), closedDays) {
  const closed = toClosedSet(closedDays);
  const start = fromDateKey(startKey);
  const end = fromDateKey(endKey);
  if (end < start) return [];

  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = toDateKey(cursor);
    if (isWorkingDay(key, closed)) days.push(key);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/**
 * Computes attendance stats given a list of absent date keys.
 * Only absences that fall on actual working days within the session
 * window are counted (defensive against stale/invalid keys).
 *
 * @param {string[]} absentKeys - array of "YYYY-MM-DD" the student was absent
 * @param {string} [endKey] - end of the counting window (defaults to today)
 * @param {Set<string>|string[]} [closedDays] - admin-declared closures
 * @returns {{ totalDays:number, presentDays:number, absentDays:number, percentage:number }}
 */
export function calcAttendance(absentKeys = [], endKey = todayKey(), closedDays) {
  const closed = toClosedSet(closedDays);
  const workingDays = getWorkingDays(SESSION_START, endKey, closed);
  const workingSet = new Set(workingDays);

  // Count only valid absences (must be a working day in range).
  const validAbsent = absentKeys.filter((k) => workingSet.has(k));
  const absentCount = new Set(validAbsent).size; // de-dupe

  const totalDays = workingDays.length;
  const presentDays = Math.max(0, totalDays - absentCount);
  const percentage = totalDays === 0 ? 100 : Math.round((presentDays / totalDays) * 1000) / 10; // 1 decimal

  return {
    totalDays,
    presentDays,
    absentDays: absentCount,
    percentage,
    monthlyAveragePercentage: calcMonthlyAveragedPercentage(absentKeys, endKey, closed),
  };
}

/**
 * Attendance as the AVERAGE OF MONTHLY AVERAGES.
 *
 * For each calendar month in the session window, compute that month's present
 * percentage (present working days / total working days × 100). The final
 * figure is the simple average of those monthly percentages.
 *
 * This weights every month equally regardless of how many working days it
 * had — e.g. after 3 months it's (April% + May% + June%) / 3. Months with no
 * working days are skipped. The current (partial) month is included up to the
 * end date.
 *
 * @param {string[]} absentKeys
 * @param {string} [endKey] - end of window (defaults to today)
 * @param {Set<string>|string[]} [closedDays]
 * @returns {number} averaged percentage, 0–100, one decimal
 */
export function calcMonthlyAveragedPercentage(absentKeys = [], endKey = todayKey(), closedDays) {
  const closed = toClosedSet(closedDays);
  const workingDays = getWorkingDays(SESSION_START, endKey, closed);
  if (workingDays.length === 0) return 100;

  const absentSet = new Set(absentKeys);

  // Group working days by "YYYY-MM" and tally present/total per month.
  const byMonth = new Map(); // "2026-04" -> { working, absent }
  for (const key of workingDays) {
    const ym = key.slice(0, 7);
    const bucket = byMonth.get(ym) || { working: 0, absent: 0 };
    bucket.working += 1;
    if (absentSet.has(key)) bucket.absent += 1;
    byMonth.set(ym, bucket);
  }

  // Average each month's present percentage.
  const monthlyPercents = [];
  for (const { working, absent } of byMonth.values()) {
    if (working === 0) continue;
    monthlyPercents.push(((working - absent) / working) * 100);
  }
  if (monthlyPercents.length === 0) return 100;

  const avg = monthlyPercents.reduce((a, b) => a + b, 0) / monthlyPercents.length;
  return Math.round(avg * 10) / 10; // one decimal
}

/**
 * Full-year attendance projection.
 *
 * Uses the complete session window (SESSION_START → SESSION_END) as the
 * denominator. Days not yet reached are assumed "present" (best-case
 * projection). Returns:
 *   - totalYearDays   : total working days in the full academic year
 *   - daysElapsed     : working days from session start to today
 *   - projectedPct    : if the student keeps their current absence rate
 *   - absolutePct     : absences / totalYearDays (already-missed days only)
 *   - canMissMore     : how many more days they can be absent and still hit 75%
 *                       (negative means they've already exceeded CBSE limit)
 */
export function calcYearAttendance(absentKeys = [], closedDays) {
  const closed = toClosedSet(closedDays);
  const today  = todayKey();

  const allYearDays  = getWorkingDays(SESSION_START, SESSION_END, closed);
  const elapsedDays  = getWorkingDays(SESSION_START, today, closed);
  const totalYear    = allYearDays.length;
  const elapsed      = elapsedDays.length;

  const elapsedSet   = new Set(elapsedDays);
  const validAbsent  = Array.from(new Set(absentKeys)).filter(k => elapsedSet.has(k));
  const absentCount  = validAbsent.length;
  const presentSoFar = elapsed - absentCount;

  // Projected %: assume same absence rate continues for remaining days
  const remaining    = totalYear - elapsed;
  const absenceRate  = elapsed === 0 ? 0 : absentCount / elapsed;
  const projAbsent   = absentCount + Math.round(absenceRate * remaining);
  const projPresent  = totalYear - projAbsent;
  const projectedPct = totalYear === 0 ? 100 : Math.round((projPresent / totalYear) * 1000) / 10;

  // Absolute %: only counts days already missed vs full year
  const absolutePct  = totalYear === 0 ? 100 : Math.round((presentSoFar / totalYear) * 1000) / 10;

  // Days can still miss: floor((totalYear * 0.25) - absentCount)
  // CBSE allows up to 25% absence, i.e. must attend at least 75%
  const maxAllowed   = Math.floor(totalYear * 0.25);
  const canMissMore  = maxAllowed - absentCount;

  return {
    totalYearDays: totalYear,
    daysElapsed:   elapsed,
    absentCount,
    projectedPct,
    absolutePct,
    canMissMore,
    maxAllowed,
  };
}
