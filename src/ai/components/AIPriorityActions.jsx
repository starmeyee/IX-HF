/**
 * /src/ai/components/AIPriorityActions.jsx
 * ──────────────────────────────────────────
 * Displays AI-generated priority action items as a numbered list.
 * Shows nothing if the array is empty or missing.
 */

import { useAIPersonalization } from '../AIPersonalizationContext';

export default function AIPriorityActions() {
  const { data, loading } = useAIPersonalization();

  if (loading) {
    return (
      <div className="ai-priority-list ai-priority-list--skeleton" aria-hidden="true">
        <div className="ai-skeleton ai-skeleton--line" style={{ width: '40%', marginBottom: '0.75rem' }} />
        {[1, 2, 3].map((i) => (
          <div key={i} className="ai-priority-item--skeleton">
            <div className="ai-skeleton ai-skeleton--number" />
            <div className="ai-skeleton ai-skeleton--line" style={{ flex: 1 }} />
          </div>
        ))}
      </div>
    );
  }

  const actions = data?.priorityActions;
  if (!Array.isArray(actions) || actions.length === 0) return null;

  return (
    <div className="ai-priority-list" role="region" aria-label="AI priority actions">
      <p className="ai-priority-heading">Priority Actions</p>
      <ol className="ai-priority-ol" aria-label="Recommended priority actions">
        {actions.slice(0, 3).map((action, idx) => (
          <li key={idx} className="ai-priority-item">
            <span className="ai-priority-number" aria-hidden="true">{idx + 1}</span>
            <span className="ai-priority-text">{action}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
