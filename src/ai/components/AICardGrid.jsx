/**
 * /src/ai/components/AICardGrid.jsx
 * ────────────────────────────────────
 * Renders the grid of AI insight cards.
 * - Loading: shows 3 skeleton cards
 * - Empty: returns null (no empty state shown to students)
 * - Cards are sorted high→medium→low (server sorts, but we enforce here too)
 */

import { useEffect } from 'react';
import { useAIPersonalization } from '../AIPersonalizationContext';
import AICard from './AICard';
import { markInsightAsSeen, getSeenInsights } from '../aiService';

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
  const { data, loading, userId } = useAIPersonalization();

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

  // Sort by numeric priority descending
  const sorted = [...data.cards]
    .sort((a, b) => {
      const pA = typeof a.priority === 'number' ? a.priority : 1;
      const pB = typeof b.priority === 'number' ? b.priority : 1;
      return pB - pA;
    });

  // Pick the highest priority card that hasn't been shown recently
  // If all are shown, just pick the top one.
  const seen = getSeenInsights(userId);
  let topCard = sorted.find(c => !seen.includes(c.title));
  if (!topCard) {
    topCard = sorted[0]; // Fallback to highest priority if all seen
  }

  // Mark as seen on render
  useEffect(() => {
    if (topCard?.title && userId) {
      markInsightAsSeen(userId, topCard.title);
    }
  }, [topCard?.title, userId]);

  return (
    <div className="ai-card-grid" aria-label="AI personalized insights">
      {topCard ? <AICard card={topCard} /> : null}
    </div>
  );
}
