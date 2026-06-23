import { X } from 'lucide-react';

/** Ensure fl_inline flag is in the Cloudinary URL for inline PDF rendering */
function inlineUrl(url) {
  if (!url) return '';
  if (url.includes('fl_inline')) return url;
  return url.replace('/raw/upload/', '/raw/upload/fl_inline/');
}

export default function NotesViewer({ note, onClose }) {
  const pdfUrl = inlineUrl(note.cloudinaryUrl);

  return (
    <div className="notes-viewer-overlay" onClick={onClose}>
      <div className="notes-viewer-modal" onClick={e => e.stopPropagation()}>
        <div className="notes-viewer-header">
          <div className="notes-viewer-title">
            <span>{note.title}</span>
            <span className="notes-viewer-meta">{note.subjectName} · {note.chapterName}</span>
          </div>
          <button className="notes-viewer-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <iframe
          className="notes-viewer-frame"
          src={pdfUrl}
          title={note.title}
          frameBorder="0"
        />
        <div className="notes-viewer-footer">
          Uploaded by <strong>{note.uploaderName}</strong>
        </div>
      </div>
    </div>
  );
}
