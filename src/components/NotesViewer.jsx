import { useState, useRef } from 'react';
import { X, Download, Loader2, AlertTriangle } from 'lucide-react';

/**
 * NotesViewer — full-screen PDF viewer + true forced download.
 *
 * View strategy:
 *   1. Render the Vercel Blob URL directly in a full-screen <iframe>.
 *      Vercel Blob CDN sets the right Content-Type (application/pdf) so
 *      Chrome's built-in PDF viewer kicks in immediately — no Google Docs,
 *      no extra round-trip, instant load.
 *   2. On iOS/Safari, <iframe> can't inline PDFs; we show a full-page fallback
 *      <embed> and, if that also fails, an "Open PDF" link.
 *
 * Download strategy:
 *   Fetch the URL as a blob, create an object URL, trigger <a download>.
 *   This is the ONLY reliable way to force a browser download for cross-origin
 *   URLs — using `<a href={url} download>` does NOT work for cross-origin
 *   resources in modern Chrome (security restriction).
 */
export default function NotesViewer({ note, onClose }) {
  const url = note.blobUrl;
  const [dlState, setDlState] = useState('idle'); // 'idle' | 'downloading' | 'error'
  const iframeRef = useRef(null);

  // ── Force download via fetch → blob ───────────────────────────
  async function handleDownload() {
    if (dlState === 'downloading') return;
    setDlState('downloading');
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      // Sanitize title: replace slashes/colons so it's a safe filename
      a.download = `${(note.title || 'notes').replace(/[/\\:*?"<>|]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoke after a short delay so the download can start
      setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
      setDlState('idle');
    } catch (err) {
      console.error('Download failed:', err);
      setDlState('error');
      // Graceful fallback: open in new tab so user can save manually
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => setDlState('idle'), 3000);
    }
  }

  // ── Detect iOS (can't inline PDFs in iframe) ──────────────────
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  return (
    <>
      <style>{`
        .nv-overlay {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(0,0,0,0.92);
          display: flex; flex-direction: column;
          animation: nvFadeIn 0.18s ease;
        }
        @keyframes nvFadeIn { from { opacity:0 } to { opacity:1 } }

        /* ── Header ── */
        .nv-header {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: #0d0f14;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
          min-height: 56px;
        }
        .nv-titles { flex: 1; min-width: 0; }
        .nv-title {
          font-size: 0.95rem; font-weight: 600;
          color: #f1f5f9;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .nv-meta {
          font-size: 0.72rem; color: rgba(255,255,255,0.4);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin-top: 0.1rem;
        }
        .nv-dl-btn {
          display: flex; align-items: center; gap: 0.45rem;
          background: var(--primary, #7c3aed);
          color: #fff; border: none; border-radius: 8px;
          padding: 0.5rem 0.9rem; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s; white-space: nowrap;
          flex-shrink: 0; min-height: 38px;
        }
        .nv-dl-btn:hover:not(:disabled) { filter: brightness(1.12); }
        .nv-dl-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .nv-dl-btn.error { background: #dc2626; }
        .nv-close-btn {
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.7); border-radius: 8px;
          width: 38px; height: 38px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s;
        }
        .nv-close-btn:hover { background: rgba(239,68,68,0.18); border-color: rgba(239,68,68,0.4); color: #f87171; }

        /* ── PDF frame ── */
        .nv-frame {
          flex: 1; width: 100%; border: none;
          display: block; background: #1a1a2e;
        }

        /* ── iOS fallback ── */
        .nv-ios-body {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 1.25rem; padding: 2rem; text-align: center;
        }
        .nv-ios-icon { color: rgba(255,255,255,0.25); }
        .nv-ios-text { color: rgba(255,255,255,0.6); font-size: 0.9rem; line-height: 1.6; }
        .nv-ios-open-btn {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: var(--primary, #7c3aed); color: #fff;
          border: none; border-radius: 10px;
          padding: 0.75rem 1.5rem; font-size: 0.9rem; font-weight: 600;
          cursor: pointer; text-decoration: none;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="nv-overlay" role="dialog" aria-modal="true" aria-label={`Viewing: ${note.title}`}>
        {/* ── Header ── */}
        <div className="nv-header">
          <div className="nv-titles">
            <div className="nv-title">{note.title}</div>
            <div className="nv-meta">
              {note.subjectName} · {note.chapterName} · by {note.uploaderName}
            </div>
          </div>

          {/* Download button */}
          <button
            className={`nv-dl-btn${dlState === 'error' ? ' error' : ''}`}
            onClick={handleDownload}
            disabled={dlState === 'downloading'}
            title="Download PDF"
          >
            {dlState === 'downloading' ? (
              <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Downloading…</>
            ) : dlState === 'error' ? (
              <><AlertTriangle size={14} /> Retry</>
            ) : (
              <><Download size={14} /> Download</>
            )}
          </button>

          {/* Close button */}
          <button className="nv-close-btn" onClick={onClose} aria-label="Close viewer">
            <X size={18} />
          </button>
        </div>

        {/* ── PDF body ── */}
        {isIOS ? (
          /* iOS can't inline PDFs — offer open in new tab + download */
          <div className="nv-ios-body">
            <AlertTriangle size={40} className="nv-ios-icon" />
            <p className="nv-ios-text">
              iOS Safari can't display PDFs inline.<br />
              Tap below to open the PDF — then use the share button to save it.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="nv-ios-open-btn"
            >
              Open PDF ↗
            </a>
          </div>
        ) : (
          /*
           * Desktop / Android Chrome: serve blob URL directly in <iframe>.
           * Vercel Blob CDN returns Content-Type: application/pdf, so Chrome's
           * native PDF viewer renders it inline instantly — no Google Docs needed.
           * The URL is hidden from the user (no address bar inside the modal).
           */
          <iframe
            ref={iframeRef}
            src={url}
            className="nv-frame"
            title={note.title}
            allowFullScreen
          />
        )}
      </div>
    </>
  );
}
