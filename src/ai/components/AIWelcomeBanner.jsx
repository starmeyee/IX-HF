/**
 * /src/ai/components/AIWelcomeBanner.jsx
 * ──────────────────────────────────────
 * Displays the AI-generated personalized header greeting.
 * Shows nothing if data is unavailable (graceful degradation).
 */

import { useAIPersonalization } from '../AIPersonalizationContext';

export default function AIWelcomeBanner() {
  const { data, loading } = useAIPersonalization();

  if (loading) {
    return (
      <div className="ai-welcome-banner ai-welcome-banner--skeleton" aria-hidden="true">
        <div className="ai-skeleton ai-skeleton--title" />
        <div className="ai-skeleton ai-skeleton--subtitle" />
      </div>
    );
  }

  if (!data?.header?.title) return null;

  return (
    <div className="ai-welcome-banner animate-fade-in" role="banner" aria-label="AI personalized greeting">
      <div className="ai-welcome-badge">
        <span aria-hidden="true">✨</span>
        <span>AI Insights</span>
      </div>
      <h2 className="ai-welcome-title">{data.header.title}</h2>
      <p className="ai-welcome-subtitle">{data.header.subtitle}</p>
    </div>
  );
}
