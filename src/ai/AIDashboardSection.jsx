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
import { AIPersonalizationProvider, useAIPersonalization } from './AIPersonalizationContext';
import AICardGrid from './components/AICardGrid';

/**
 * Inner component — assumes it is inside AIPersonalizationProvider.
 * This separation ensures hook ordering is correct.
 */
import { Sparkles } from 'lucide-react';
import AIMotivationBanner from './components/AIMotivationBanner';

function AIDashboardContent() {
  const { data, loading } = useAIPersonalization();

  // Hide entirely while loading, or if no data returned from AI
  if (loading || !data || !data.cards || data.cards.length === 0) {
    return null;
  }

  return (
    <section
      className="ai-dashboard-section"
      aria-label="AI Personalized Insights"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.1rem' }}>
        <Sparkles size={16} color="#f59e0b" />
        <h2 className="section-title" style={{ marginBottom: 0, color: '#f59e0b', fontSize: '0.95rem' }}>AI Insights</h2>
      </div>

      <AICardGrid />
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
