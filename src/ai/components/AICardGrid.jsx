/**
 * /src/ai/components/AICardGrid.jsx
 * ────────────────────────────────────
 * Renders the grid of AI insight cards.
 * - Loading: shows 3 skeleton cards
 * - Empty: returns null (no empty state shown to students)
 * - Cards are sorted high→medium→low (server sorts, but we enforce here too)
 */

import { useAIPersonalization } from '../AIPersonalizationContext';
import AICard from './AICard';

// Priority sort order
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function SkeletonCard() {
  return (
    <div className="ai-card ai-card--skeleton" aria-hidden="true">
      <div className="ai-card-header">
        <div className="ai-skeleton ai-skeleton--icon" />
        <div className="ai-skeleton ai-skeleton--tag" />
      </div>
      <div className="ai-skeleton ai-skeleton--line-bold" />
      <div className="ai-skeleton ai-skeleton--line" />
      <div className="ai-skeleton ai-skeleton--line ai-skeleton--short" />
    </div>
  );
}

export default function AICardGrid() {
  const { data, loading } = useAIPersonalization();

  if (loading) {
    return (
      <div className="ai-card-grid" aria-busy="true" aria-label="Loading AI insights">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!data?.cards || data.cards.length === 0) return null;

  // Enforce max 5, sort by priority
  const sorted = [...data.cards]
    .slice(0, 5)
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));

  return (
    <div className="ai-card-grid" aria-label="AI personalized insights">
      {sorted.map((card, idx) => (
        <AICard key={`ai-card-${idx}`} card={card} />
      ))}
    </div>
  );
}
