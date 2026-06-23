import { X, ExternalLink } from 'lucide-react';

/**
 * Full-screen modal PDF viewer using Google Docs viewer embed.
 * No download option exposed.
 */
export default function NotesViewer({ note, onClose }) {
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(note.cloudinaryUrl)}&embedded=true`;

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
          src={viewerUrl}
          title={note.title}
          frameBorder="0"
          allowFullScreen
        />
        <div className="notes-viewer-footer">
          Uploaded by <strong>{note.uploaderName}</strong>
        </div>
      </div>
    </div>
  );
}
