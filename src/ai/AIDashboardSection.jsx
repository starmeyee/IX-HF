/**
 * /src/ai/AIDashboardSection.jsx
 * ────────────────────────────────
 * Complete AI Personalization section to drop into StudentDashboard.
 *
 * Wraps AIPersonalizationProvider and renders all AI sub-components.
 * Shows nothing on error (graceful degradation).
 * Only renders for logged-in non-teacher users.
 *
 * Usage in StudentDashboard:
 *   <AIDashboardSection userData={{ attendance: stats, absentDays, ... }} />
 */

import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roles';
import { AIPersonalizationProvider } from './AIPersonalizationContext';
import AIWelcomeBanner from './components/AIWelcomeBanner';
import AICardGrid from './components/AICardGrid';
import AIMotivationBanner from './components/AIMotivationBanner';
import AIFocusCard from './components/AIFocusCard';
import AIPriorityActions from './components/AIPriorityActions';

/**
 * Inner component — assumes it is inside AIPersonalizationProvider.
 * This separation ensures hook ordering is correct.
 */
function AIDashboardContent() {
  return (
    <section
      className="ai-dashboard-section"
      aria-label="AI Personalized Insights"
    >
      {/* Welcome greeting + subtitle */}
      <AIWelcomeBanner />

      {/* AI insight cards (reminder, achievement, tip, insight, alert) */}
      <AICardGrid />

      {/* Two-column row: focus + motivation */}
      <div className="ai-bottom-row">
        <AIFocusCard />
        <AIPriorityActions />
      </div>

      {/* Motivational quote */}
      <AIMotivationBanner />
    </section>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.userData - All dashboard data for AI context building:
 *   {
 *     attendance: Object,     // calcAttendance() output
 *     absentDays: Array,
 *     holidayCompleted: number,
 *     holidayTotal: number,
 *     latestHw: Object|null,
 *     doneKeys: Set,
 *     syllabusStats: Object|null,
 *     latestClasswork: Object|null
 *   }
 */
export default function AIDashboardSection({ userData }) {
  const { currentUser } = useAuth();

  // Guard: only show for logged-in non-teacher users
  if (!currentUser) return null;
  if (currentUser.role === ROLES.TEACHER) return null;

  return (
    <AIPersonalizationProvider userData={userData}>
      <AIDashboardContent />
    </AIPersonalizationProvider>
  );
}
