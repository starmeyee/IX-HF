/**
 * GET /api/note-share?id=<noteId>
 * Returns HTML with OG tags for link previews (WhatsApp etc.)
 * Real users are immediately redirected to /notes in the SPA.
 */
import { adminDb } from './_lib/firebaseAdmin.js';

function esc(s) {
  return (s || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  const host   = req.headers['x-forwarded-host'] || req.headers.host;
  const proto  = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const origin = `${proto}://${host}`;

  const noteId = new URL(req.url, origin).searchParams.get('id') || '';

  let title       = '10th HI — Notes Exchange';
  let description = 'Browse and share chapter notes with your classmates.';
  let subject     = '';
  let chapter     = '';

  try {
    if (noteId) {
      const snap = await adminDb().collection('notes').doc(noteId).get();
      if (snap.exists) {
        const d = snap.data();
        title       = `${d.title} — Notes`;
        subject     = d.subjectName || '';
        chapter     = d.chapterName || '';
        description = `${subject} · ${chapter}${d.description ? ' · ' + d.description : ''} | Shared via 10th HI Portal`;
      }
    }
  } catch (err) {
    console.error('note-share:', err);
  }

  const imgUrl  = `${origin}/api/og-image?type=notes&title=${encodeURIComponent(title)}&lines=${encodeURIComponent([subject, chapter].filter(Boolean).join('|'))}`;
  const appUrl  = `${origin}/notes?noteId=${encodeURIComponent(noteId)}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(title)} | 10th HI Portal</title>
<meta name="description" content="${esc(description)}"/>
<meta property="og:type" content="article"/>
<meta property="og:site_name" content="10th HI Portal"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:image" content="${esc(imgUrl)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:url" content="${esc(origin)}/api/note-share?id=${esc(noteId)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${esc(imgUrl)}"/>
<meta http-equiv="refresh" content="0; url=${esc(appUrl)}"/>
<script>window.location.replace(${JSON.stringify(appUrl)});</script>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#09090b;color:#fafafa;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;}a{color:#8b5cf6;}</style>
</head>
<body><p>Opening 10th HI Portal… <a href="${esc(appUrl)}">Tap here if not redirected</a></p></body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).send(html);
}
