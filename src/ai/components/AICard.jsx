/**
 * /src/ai/components/AICard.jsx
 * ──────────────────────────────
 * Renders a single AI insight card from data.cards[].
 * Visual style uses the existing glass-card pattern with a colored left border.
 */

// Card type → icon character + color mapping
const TYPE_CONFIG = {
  reminder: { icon: '⏰', color: '#f59e0b', label: 'Reminder' },
  achievement: { icon: '🏆', color: '#10b981', label: 'Achievement' },
  tip: { icon: '💡', color: '#8b5cf6', label: 'Study Tip' },
  insight: { icon: '📈', color: '#3b82f6', label: 'Insight' },
  alert: { icon: '⚠️', color: '#ef4444', label: 'Alert' },
};

// Priority → border opacity
const PRIORITY_OPACITY = {
  high: 1,
  medium: 0.65,
  low: 0.4,
};

/**
 * @param {Object} props
 * @param {Object} props.card - Single card object from AI response
 * @param {string} props.card.type - 'reminder'|'achievement'|'tip'|'insight'|'alert'
 * @param {string} props.card.priority - 'high'|'medium'|'low'
 * @param {string} props.card.title
 * @param {string} props.card.description
 */
export default function AICard({ card }) {
  if (!card) return null;

  const config = TYPE_CONFIG[card.type] || TYPE_CONFIG.insight;
  const opacity = PRIORITY_OPACITY[card.priority] ?? 0.6;
  const borderColor = `color-mix(in srgb, ${config.color} ${Math.round(opacity * 100)}%, transparent)`;

  return (
    <div
      className="ai-card"
      style={{ borderLeftColor: borderColor }}
      role="article"
      aria-label={`${config.label}: ${card.title}`}
    >
      <div className="ai-card-header">
        <div
          className="ai-card-icon"
          style={{ background: `${config.color}18`, color: config.color }}
          aria-hidden="true"
        >
          {config.icon}
        </div>
        <div className="ai-card-meta">
          <span className="ai-card-type-label" style={{ color: config.color }}>
            {config.label}
          </span>
          {card.priority === 'high' && (
            <span className="ai-card-priority-badge">Urgent</span>
          )}
        </div>
      </div>
      <p className="ai-card-title">{card.title}</p>
      <p className="ai-card-desc">{card.description}</p>
    </div>
  );
}
