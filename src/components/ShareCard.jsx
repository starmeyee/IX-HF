import { forwardRef } from 'react';

/**
 * Off-screen styled card used as the html-to-image capture target.
 * Rendered at a fixed width so the screenshot is consistent regardless
 * of the viewport.
 *
 * @param {{ date: string, tasks: {subject:string, description:string}[] }} props
 */
const ShareCard = forwardRef(function ShareCard({ date, tasks = [] }, ref) {
  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        width: 520,
        background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
        borderRadius: 20,
        padding: '28px 28px 24px',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        color: '#f8fafc',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 4,
        background: 'linear-gradient(90deg, #8b5cf6, #ec4899)',
        borderRadius: '20px 20px 0 0',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8b5cf6', margin: '0 0 4px' }}>
            IX HF · Homework
          </p>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>
            {date}
          </h2>
        </div>
        <div style={{
          background: 'rgba(139,92,246,0.15)',
          border: '1px solid rgba(139,92,246,0.4)',
          borderRadius: 10,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: '#a78bfa',
        }}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tasks.map((task, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderLeft: '3px solid #8b5cf6',
            borderRadius: 10,
            padding: '12px 14px',
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px', color: '#e2e8f0' }}>
              {task.subject}
            </p>
            <p style={{
              fontSize: 12, color: '#94a3b8', margin: 0,
              lineHeight: 1.55, whiteSpace: 'pre-wrap',
              // clamp very long descriptions so card doesn't grow too tall
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {task.description}
            </p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p style={{
        marginTop: 18, marginBottom: 0,
        fontSize: 11, color: '#52525b',
        textAlign: 'right',
        letterSpacing: '0.03em',
      }}>
        IX HF Portal · xhiportal.vercel.app
      </p>
    </div>
  );
});

export default ShareCard;
