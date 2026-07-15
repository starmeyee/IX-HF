/**
 * GET /api/notice-share?id=<noticeId>
 * Returns HTML with OG tags for link previews (WhatsApp etc.)
 * Real users are immediately redirected to /notices in the SPA.
 */
import { adminDb } from './_lib/firebaseAdmin.js';

function esc(s) {
  return (s || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Strip WhatsApp/markdown symbols + collapse whitespace for clean previews.
function clean(s, max = 160) {
  const t = (s || '').toString()
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_>`~#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

export default async function handler(req, res) {
  const host   = req.headers['x-forwarded-host'] || req.headers.host;
  const proto  = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const origin = `${proto}://${host}`;

  const noticeId = new URL(req.url, origin).searchParams.get('id') || '';

  let title       = '📢 Class Notice — IX HF';
  let description = 'Latest announcement for IX HF.';
  let author      = '';

  try {
    if (noticeId) {
      const snap = await adminDb().collection('notices').doc(noticeId).get();
      if (snap.exists) {
        const d = snap.data();
        const preview = clean(d.body, 110);
        title       = preview ? `📢 ${preview.slice(0, 60)}${preview.length > 60 ? '…' : ''}` : title;
        author      = d.authorName || '';
        description = `${preview}${author ? ' — ' + author : ''} | IX HF Portal`;
      }
    }
  } catch (err) {
    console.error('notice-share:', err);
  }

  const imgUrl  = `${origin}/api/og-image?type=notice&title=${encodeURIComponent(title)}&lines=${encodeURIComponent(author ? 'By ' + author : '')}`;
  const appUrl  = `${origin}/notices`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(title)} | IX HF Portal</title>
<meta name="description" content="${esc(description)}"/>
<meta property="og:type" content="article"/>
<meta property="og:site_name" content="IX HF Portal"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:image" content="${esc(imgUrl)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:url" content="${esc(origin)}/api/notice-share?id=${esc(noticeId)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${esc(imgUrl)}"/>
<meta http-equiv="refresh" content="0; url=${esc(appUrl)}"/>
<script>window.location.replace(${JSON.stringify(appUrl)});</script>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#09090b;color:#fafafa;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;}a{color:#8b5cf6;}</style>
</head>
<body><p>Opening IX HF Portal… <a href="${esc(appUrl)}">Tap here if not redirected</a></p></body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).send(html);
}
