/**
 * /src/ai/components/AIFocusCard.jsx
 * ────────────────────────────────────
 * Displays the AI-recommended study focus subject and reason.
 * Compact card using the primary accent color.
 * Shows nothing if studyFocus is absent.
 */

import { useAIPersonalization } from '../AIPersonalizationContext';

export default function AIFocusCard() {
  const { data, loading } = useAIPersonalization();

  if (loading) {
    return (
      <div className="ai-focus-card ai-focus-card--skeleton" aria-hidden="true">
        <div className="ai-skeleton ai-skeleton--icon" />
        <div style={{ flex: 1 }}>
          <div className="ai-skeleton ai-skeleton--line-bold" />
          <div className="ai-skeleton ai-skeleton--line ai-skeleton--short" />
        </div>
      </div>
    );
  }

  const focus = data?.studyFocus;
  if (!focus?.subject) return null;

  return (
    <div className="ai-focus-card" role="region" aria-label="Recommended study focus">
      <div className="ai-focus-icon" aria-hidden="true">📚</div>
      <div className="ai-focus-content">
        <p className="ai-focus-label">Study Focus</p>
        <p className="ai-focus-subject">{focus.subject}</p>
        {focus.reason && (
          <p className="ai-focus-reason">{focus.reason}</p>
        )}
      </div>
    </div>
  );
}
