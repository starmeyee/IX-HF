import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const h = (type, props, ...children) => ({
  type,
  props: { ...props, children: children.length <= 1 ? children[0] : children },
});

export default function handler() {
  const accent = '#8b5cf6';
  const pink   = '#ec4899';

  const stats = [
    { label: 'Test 1 Avg', value: '5.60' },
    { label: 'Test 2 Avg', value: '5.21' },
    { label: 'Top Scorer',  value: 'Anuraj' },
    { label: 'Attendance',  value: '70%' },
  ];

  const tree = h('div', {
    style: {
      width: '1200px', height: '630px', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(135deg, #09090b 0%, #0d0d14 100%)',
      padding: '60px 70px', fontFamily: 'sans-serif', position: 'relative',
      overflow: 'hidden',
    },
  },
    // Top accent bar
    h('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, height: 10, background: `linear-gradient(90deg, ${accent}, ${pink})`, display: 'flex' } }),

    // Glow blobs
    h('div', { style: { position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'rgba(139,92,246,0.12)', display: 'flex', filter: 'blur(60px)' } }),
    h('div', { style: { position: 'absolute', bottom: -80, left: 200, width: 300, height: 300, borderRadius: '50%', background: 'rgba(236,72,153,0.1)', display: 'flex', filter: 'blur(60px)' } }),

    // Header row
    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 44 } },
      h('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'rgba(139,92,246,0.15)', border: `1.5px solid rgba(139,92,246,0.4)`,
          padding: '10px 24px', borderRadius: 9999, fontSize: 26, fontWeight: 700, color: accent,
        },
      }, '📊  Analytics Report'),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: 26, fontWeight: 700, color: '#fafafa' } },
        h('div', { style: { width: 36, height: 36, borderRadius: 9, background: `linear-gradient(135deg, ${accent}, ${pink})`, display: 'flex' } }),
        h('div', { style: { display: 'flex' } }, '10th HI Portal'),
      ),
    ),

    // Title
    h('div', {
      style: {
        fontSize: 72, fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 12,
        background: `linear-gradient(135deg, #ffffff 30%, ${accent})`,
        '-webkit-background-clip': 'text', color: 'transparent', display: 'flex',
      },
    }, 'Maths Dashboard'),

    // Subtitle
    h('div', { style: { fontSize: 32, color: '#a1a1aa', marginBottom: 44, display: 'flex' } },
      'Weekly Test 1 & Test 2 · Class 10 HI · 40 Students'
    ),

    // Stats row
    h('div', { style: { display: 'flex', gap: '20px' } },
      ...stats.map(s =>
        h('div', {
          style: {
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '6px',
          },
        },
          h('div', { style: { fontSize: 20, color: '#71717a', fontWeight: 600, display: 'flex', textTransform: 'uppercase', letterSpacing: '0.05em' } }, s.label),
          h('div', { style: { fontSize: 34, fontWeight: 800, color: '#ffffff', display: 'flex' } }, s.value),
        )
      )
    ),

    // Footer
    h('div', {
      style: {
        position: 'absolute', bottom: 44, left: 70, right: 70,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 24, color: '#52525b', borderTop: '1px solid #27272a', paddingTop: 20,
      },
    },
      h('div', { style: { display: 'flex' } }, 'x-hi.vercel.app/maths'),
      h('div', { style: { display: 'flex', color: accent } }, 'Tap to see full dashboard →'),
    ),
  );

  return new ImageResponse(tree, { width: 1200, height: 630 });
}
