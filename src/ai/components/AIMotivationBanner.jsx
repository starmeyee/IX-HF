/**
 * /src/ai/components/AIMotivationBanner.jsx
 * ───────────────────────────────────────────
 * Displays the AI-generated motivation quote.
 * Shows nothing if motivation is absent or empty.
 */

import { useAIPersonalization } from '../AIPersonalizationContext';

export default function AIMotivationBanner() {
  const { data, loading } = useAIPersonalization();

  if (loading) return null; // No skeleton for motivation — keep it light

  const motivation = data?.motivation;
  if (!motivation || typeof motivation !== 'string' || motivation.trim().length === 0) {
    return null;
  }

  return (
    <div className="ai-motivation" role="complementary" aria-label="Motivational insight">
      <span className="ai-motivation-quote-mark" aria-hidden="true">"</span>
      <p className="ai-motivation-text">{motivation.trim()}</p>
    </div>
  );
}
