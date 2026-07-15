/**
 * /src/ai/contextEngine.js
 * ─────────────────────────
 * Builds a clean, anonymized user context object for the AI personalization API.
 *
 * SECURITY CONTRACT:
 *  - No phone numbers, passwords, or auth tokens are ever included.
 *  - Only the server-side endpoint (/api/ai-personalize) receives this object.
 *  - All data is aggregated/summarized — not raw Firestore records.
 */
import { getPeriodsForDate } from '../data/routine';

/**
 * Returns the time-of-day label for a given hour (0-23).
 * @param {number} hour
 * @returns {'morning'|'afternoon'|'evening'|'night'}
 */
function getTimeOfDay(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Returns the day-of-week string for a given Date.
 * @param {Date} date
 * @returns {string}
 */
function getDayOfWeek(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Formats a Date to YYYY-MM-DD (local time).
 * @param {Date} date
 * @returns {string}
 */
function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Builds the anonymized user context payload for the AI personalization endpoint.
 *
 * @param {Object} user - The currentUser object from AuthContext.
 *   Expected fields: name, rollNo, role, phone (will NOT be included), createdAt
 * @param {Object} data - Pre-fetched dashboard data.
 *   @param {Object}  data.attendance        - calcAttendance() output: { percentage, absentDays, totalDays, presentDays }
 *   @param {Array}   data.absentDays        - Array of absent date keys
 *   @param {Object|null} data.latestHw      - Latest homework entry { date, tasks[] }
 *   @param {Set}     data.doneKeys          - Set of completed homework task keys
 *   @param {number}  data.holidayCompleted  - Count of completed holiday hw items
 *   @param {number}  data.holidayTotal      - Total holiday hw items
 *   @param {Object|null} data.syllabusStats - { completedPct, checkedPct, completed, total }
 *   @param {Object|null} data.latestClasswork - Latest classwork { date, periods[] }
 *   @param {Array}   data.recentNotices     - Array of recent notices { body, createdAtMs }
 *   @param {Array}   data.previouslyShown   - Array of recently shown insight titles to avoid repeating
 *
 * @returns {Object} Clean anonymized context object safe to send to AI endpoint.
 */
export async function buildUserContext(user, data) {
  const now = new Date();
  const currentHour = now.getHours();

  // ── Profile (anonymized — no phone, no password, no auth tokens) ─────────────
  const firstName = user.name ? user.name.split(' ')[0] : 'Student';
  const profile = {
    name: user.name || 'Student',
    firstName,
    rollNo: user.rollNo || null,
    role: user.role || 'student',
    joinedAt: user.createdAt
      ? (typeof user.createdAt === 'string'
          ? user.createdAt.split('T')[0]
          : toDateKey(new Date(user.createdAt)))
      : null,
  };

  // ── Academic ──────────────────────────────────────────────────────────────────
  const {
    attendance,
    absentDays = [],
    latestHw,
    doneKeys,
    holidayCompleted,
    holidayTotal,
    syllabusStats,
    latestClasswork,
    recentNotices = [],
    previouslyShown = [],
  } = data || {};

  // Attendance section
  const attSection = attendance
    ? {
        percentage: Math.round(attendance.percentage) || 0,
        absentDays: attendance.absentDays ?? absentDays.length ?? 0,
        totalDays: attendance.totalDays ?? 0,
        presentDays: attendance.presentDays ?? 0,
        canMissMore: attendance.canMissMore ?? null,
      }
    : null;

  // Today's / latest homework section
  let hwSection = null;
  if (latestHw) {
    const tasks = latestHw.tasks || [];
    const completedTasks = tasks.filter((_, idx) => {
      const key = `${latestHw.id}_${idx}`;
      return doneKeys instanceof Set ? doneKeys.has(key) : false;
    });
    hwSection = {
      date: latestHw.date || null,
      taskCount: tasks.length,
      completedCount: completedTasks.length,
      tasks: tasks.map((t, idx) => ({
        subject: t.subject,
        done: doneKeys instanceof Set ? doneKeys.has(`${latestHw.id}_${idx}`) : false,
      })),
    };
  }

  // Pending homework from the past 7 days
  const pendingHomework = [];
  if (data.recentHomeworks && Array.isArray(data.recentHomeworks) && doneKeys instanceof Set) {
    data.recentHomeworks.forEach(hw => {
      if (!hw.tasks) return;
      hw.tasks.forEach((task, idx) => {
        const key = `${hw.id}_${idx}`;
        if (!doneKeys.has(key)) {
          pendingHomework.push({ date: hw.date, subject: task.subject });
        }
      });
    });
  }

  // Holiday homework section
  const hhSection =
    holidayCompleted != null && holidayTotal != null
      ? {
          completed: holidayCompleted,
          total: holidayTotal,
          percentage: Math.round((holidayCompleted / Math.max(holidayTotal, 1)) * 100),
        }
      : null;

  // Syllabus section
  const syllabusSection = syllabusStats
    ? {
        completedPct: Math.round(syllabusStats.completedPct) || 0,
        checkedPct: Math.round(syllabusStats.checkedPct) || 0,
        completedTopics: syllabusStats.completed ?? null,
        totalTopics: syllabusStats.total ?? null,
      }
    : null;

  // Latest classwork section
  let classworkSection = null;
  if (latestClasswork) {
    classworkSection = {
      date: latestClasswork.date || null,
      periodsCount: (latestClasswork.periods || []).length,
      subjects: (latestClasswork.periods || []).map((p) => p.subject).filter(Boolean),
    };
  }

  const academic = {
    attendance: attSection,
    todayHomework: hwSection,
    pendingRecentHomework: pendingHomework.length > 0 ? pendingHomework : null,
    holidayHomework: hhSection,
    syllabus: syllabusSection,
    latestClasswork: classworkSection,
  };

  // ── Notices & History ────────────────────────────────────────────────────────
  const recentNoticesList = recentNotices.map(n => ({
    body: n.body,
    time: new Date(n.createdAtMs).toLocaleString('en-US'),
  }));

  // ── Temporal & Routine ─────────────────────────────────────────────────────────
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrow);
  const tomorrowRoutine = (await getPeriodsForDate(tomorrowKey)).map(p => p.subject);

  const temporal = {
    currentHour,
    dayOfWeek: getDayOfWeek(now),
    timeOfDay: getTimeOfDay(currentHour),
    date: toDateKey(now),
    upcomingRoutine: {
      date: tomorrowKey,
      dayOfWeek: getDayOfWeek(tomorrow),
      subjects: tomorrowRoutine.length > 0 ? tomorrowRoutine : ['No classes / Holiday']
    }
  };

  return { profile, academic, temporal, notices: recentNoticesList, previouslyShown };
}
