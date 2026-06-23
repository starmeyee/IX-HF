/**
 * GET /maths-share
 * Returns an HTML page with OG meta tags for WhatsApp/social previews,
 * then redirects browsers to /maths in the SPA.
 */

function esc(s) {
  return (s || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default function handler(req, res) {
  const host   = req.headers['x-forwarded-host'] || req.headers.host;
  const proto  = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const origin = `${proto}://${host}`;

  const appUrl  = `${origin}/maths`;
  const imgUrl  = `${origin}/api/maths-og-image`;
  const title   = 'Maths Dashboard — Class 10 HI';
  const desc    = 'Weekly Maths Test 1 & Test 2 results for Class 10 HI. Check scores, rankings, attendance, and detailed analytics.';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="10th HI Portal" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${esc(appUrl)}" />
<meta property="og:image" content="${esc(imgUrl)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${esc(imgUrl)}" />
<meta http-equiv="refresh" content="0; url=${esc(appUrl)}" />
<script>window.location.replace(${JSON.stringify(appUrl)});</script>
<style>
  body { margin:0; font-family:system-ui,sans-serif; background:#09090b; color:#fafafa;
    display:flex; align-items:center; justify-content:center; height:100vh; text-align:center; }
  a { color:#8b5cf6; font-weight:600; }
</style>
</head>
<body>
  <div>
    <p>Opening Maths Dashboard…</p>
    <p><a href="${esc(appUrl)}">Tap here if you are not redirected</a></p>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.status(200).send(html);
}
