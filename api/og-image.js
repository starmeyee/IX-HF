import { ImageResponse } from '@vercel/og';

/**
 * Edge endpoint that renders a branded 1200×630 PNG preview card for link
 * previews (WhatsApp / social). Driven entirely by query params so it stays
 * stateless — the Node /api/share endpoint reads Firestore and points the
 * og:image at this URL with the right params.
 *
 * Query params:
 *   type  = 'homework' | 'classwork'
 *   title = headline (e.g. "Friday, 19 June")
 *   lines = up to a few summary lines, separated by "|" (subjects / periods)
 *
 * Runs on the Edge runtime (required by @vercel/og). No Firestore here —
 * that lives in the Node /api/share function.
 */
export const config = { runtime: 'edge' };

// Build element trees with plain objects (no JSX transform in /api).
const h = (type, props, ...children) => ({
  type,
  props: { ...props, children: children.length <= 1 ? children[0] : children },
});

function clampText(s, max) {
  const t = (s || '').toString();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

export default function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'homework';
    const isClasswork = type === 'classwork';
    const isNotes     = type === 'notes';
    const isNotice    = type === 'notice';
    const isHome      = type === 'home';
    const title = clampText(searchParams.get('title') || 'IX HF Portal', 48);
    const rawLines = (searchParams.get('lines') || '').split('|').map((l) => l.trim()).filter(Boolean).slice(0, 5);

    const accent     = isNotice ? '#ec4899' : isNotes ? '#f59e0b' : isClasswork ? '#FF6D00' : '#8b5cf6';
    const accentSoft = isNotice ? 'rgba(236,72,153,0.18)' : isNotes ? 'rgba(245,158,11,0.18)' : isClasswork ? 'rgba(255,109,0,0.18)' : 'rgba(139,92,246,0.18)';
    const label      = isHome ? 'PORTAL' : isNotice ? 'NOTICE' : isNotes ? 'NOTES' : isClasswork ? 'CLASSWORK' : 'HOMEWORK';
    const emoji      = isHome ? '🎓' : isNotice ? '📢' : isNotes ? '📄' : isClasswork ? '📝' : '📋';

    const lineEls = rawLines.length
      ? rawLines.map((line) =>
          h('div', {
            style: {
              display: 'flex', alignItems: 'center', gap: '14px',
              fontSize: 30, color: '#d4d4d8', marginBottom: 14,
            },
          },
            h('div', { style: { width: 12, height: 12, borderRadius: 6, background: accent, display: 'flex' } }),
            h('div', { style: { display: 'flex' } }, clampText(line, 54)),
          )
        )
      : [h('div', { style: { fontSize: 30, color: '#a1a1aa', display: 'flex' } }, 'Tap to view full details in the app')];

    const tree = h('div', {
      style: {
        width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
        padding: '70px', fontFamily: 'sans-serif', position: 'relative',
      },
    },
      // Accent glow bar
      h('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, height: 12, background: accent, display: 'flex' } }),
      // Top row: badge + brand
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 50 } },
        h('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: '14px',
            background: accentSoft, border: `2px solid ${accent}`, color: accent,
            padding: '12px 28px', borderRadius: 9999, fontSize: 30, fontWeight: 700,
          },
        }, `${emoji}  ${label}`),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', fontSize: 30, fontWeight: 700, color: '#fafafa' } },
          h('div', { style: { width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', display: 'flex' } }),
          h('div', { style: { display: 'flex' } }, 'IX HF'),
        ),
      ),
      // Title
      h('div', { style: { fontSize: 64, fontWeight: 800, color: '#ffffff', marginBottom: 40, display: 'flex', lineHeight: 1.1 } }, title),
      // Lines
      h('div', { style: { display: 'flex', flexDirection: 'column' } }, ...lineEls),
      // Footer
      h('div', {
        style: {
          position: 'absolute', bottom: 50, left: 70, right: 70,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 26, color: '#71717a', borderTop: '1px solid #27272a', paddingTop: 24,
        },
      },
        h('div', { style: { display: 'flex' } }, 'X HI Portal'),
        h('div', { style: { display: 'flex' } }, 'Open to see more →'),
      ),
    );

    return new ImageResponse(tree, { width: 1200, height: 630 });
  } catch (err) {
    return new Response(`Failed to generate image: ${err.message}`, { status: 500 });
  }
}
