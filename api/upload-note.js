/**
 * Client-upload token endpoint for Vercel Blob.
 * The browser calls this to get an upload token, then uploads
 * the file directly to Vercel Blob (bypasses the 4.5 MB function limit).
 */
import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
      req.on('error', reject);
    });

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Validate: only PDFs allowed, max 10 MB
        if (!pathname.endsWith('.pdf')) throw new Error('Only PDF files are allowed.');
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 10 * 1024 * 1024,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async () => {
        // Nothing to do server-side after upload
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (err) {
    console.error('[upload-note]', err);
    return res.status(400).json({ error: err.message || 'Upload failed.' });
  }
}
