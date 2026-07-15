import { adminDb } from './_lib/firebaseAdmin.js';

/**
 * GET /share/:type/:date   (rewritten to /api/share by vercel.json)
 *   e.g. /share/homework/2026-06-19  ·  /share/classwork/2026-06-19
 *
 * Returns a tiny HTML page with per-date Open Graph tags so link previews
 * (WhatsApp / social) show a rich, dynamic card. Real visitors are redirected
 * straight into the SPA; crawlers just read the meta tags.
 *
 * The og:image points at the Edge /api/og-image function which renders the
 * actual PNG. This split is required: firebase-admin (Firestore) needs Node,
 * @vercel/og needs Edge — they can't share one function.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Escape text destined for HTML attributes / body.
function esc(s) {
  return (s || '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Strip markdown-ish symbols + collapse whitespace for clean previews.
function clean(s, max = 160) {
  const t = (s || '').toString().replace(/[#*_>`~|]/g, '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

// Local YYYY-MM-DD for a Date (avoid UTC shift).
function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function prettyDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const origin = `${proto}://${host}`;

  // Parse /share/:type/:date from the path (query fallback for safety).
  const url = new URL(req.url, origin);
  const parts = url.pathname.split('/').filter(Boolean); // ['share','homework','2026-06-19']
  let type = (parts[1] || url.searchParams.get('type') || '').toLowerCase();
  let date = parts[2] || url.searchParams.get('date') || '';

  if (type !== 'homework' && type !== 'classwork') type = 'homework';
  const validDate = DATE_RE.test(date);

  // Defaults (used on error / not-found — always a valid preview).
  let title = 'IX HF Portal';
  let description = type === 'classwork'
    ? 'Classwork for IX HF — see what was done in each period.'
    : 'Daily homework for IX HF — check tasks and track completion.';
  let lines = [];
  let appPath = type === 'classwork' ? `/homework?tab=classwork` : `/homework`;

  try {
    if (validDate) {
      const db = adminDb();

      if (type === 'classwork') {
        const snap = await db.collection('classwork').doc(date).get();
        if (snap.exists) {
          const cw = snap.data();
          title = `Classwork · ${cw.weekday || prettyDate(date)}`;
          lines = (cw.periods || []).map((p) => `${p.period} ${p.subject}`);
          description = clean(
            (cw.periods || []).map((p) => `${p.subject}: ${p.note}`).join(' • ')
          ) || description;
        }
        appPath = `/homework?tab=classwork&date=${date}`;
      } else {
        // Homework docs are keyed by timestamp; match by display date → key.
        const all = await db.collection('homework').get();
        let match = null;
        all.forEach((doc) => {
          const data = doc.data();
          const d = new Date(data.date);
          if (!isNaN(d) && toDateKey(d) === date) match = data;
        });
        if (match) {
          title = `Homework · ${prettyDate(date)}`;
          lines = (match.tasks || []).map((t) => t.subject);
          description = clean(
            (match.tasks || []).map((t) => `${t.subject}: ${t.description}`).join(' • ')
          ) || description;
        }
        appPath = `/homework?date=${date}`;
      }
    }
  } catch (err) {
    // Never fail a crawler — fall through to generic-but-valid tags.
    console.error('share: firestore read failed', err);
  }

  // Build the dynamic OG image URL (Edge function renders the PNG).
  const imgUrl =
    `${origin}/api/og-image?type=${encodeURIComponent(type)}` +
    `&title=${encodeURIComponent(title)}` +
    `&lines=${encodeURIComponent(lines.slice(0, 5).join('|'))}`;

  const appUrl = `${origin}${appPath}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} | IX HF Portal</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="IX HF Portal" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(imgUrl)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${esc(appUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(imgUrl)}" />
<meta http-equiv="refresh" content="0; url=${esc(appUrl)}" />
<script>window.location.replace(${JSON.stringify(appUrl)});</script>
<style>
  body { margin:0; font-family: system-ui, sans-serif; background:#09090b; color:#fafafa;
    display:flex; align-items:center; justify-content:center; height:100vh; text-align:center; }
  a { color:#8b5cf6; font-weight:600; }
</style>
</head>
<body>
  <div>
    <p>Opening IX HF Portal…</p>
    <p><a href="${esc(appUrl)}">Tap here if you are not redirected</a></p>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).send(html);
}
