import { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { syllabusData } from '../data/syllabusData';
import { uploadNotePDF, submitNote } from '../services/notesService';

const MAX_MB = 10;

export default function UploadNoteModal({ currentUser, onClose, onSuccess }) {
  const [sectionId,  setSectionId]  = useState('');
  const [subjectId,  setSubjectId]  = useState('');
  const [chapterId,  setChapterId]  = useState('');
  const [title,      setTitle]      = useState('');
  const [desc,       setDesc]       = useState('');
  const [file,       setFile]       = useState(null);
  const [busy,       setBusy]       = useState(false);
  const [progress,   setProgress]   = useState(''); // status string
  const [err,        setErr]        = useState('');

  const selectedSection = syllabusData.find(s => s.sectionId === sectionId);
  const selectedSubject = selectedSection?.subjects.find(s => s.subjectId === subjectId);
  const selectedChapter = selectedSubject?.chapters.find(c => c.chapterId === chapterId);

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { setErr('Only PDF files are allowed.'); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setErr(`File must be under ${MAX_MB}MB.`); return; }
    setErr(''); setFile(f);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedSection || !selectedSubject || !selectedChapter) { setErr('Select section, subject and chapter.'); return; }
    if (!title.trim()) { setErr('Enter a title.'); return; }
    if (!file) { setErr('Select a PDF file.'); return; }

    setBusy(true); setErr('');
    try {
      setProgress('Uploading PDF…');
      const { url, publicId } = await uploadNotePDF(file);

      setProgress('Saving…');
      await submitNote({
        sectionId:   selectedSection.sectionId,
        subjectId:   selectedSubject.subjectId,
        chapterId:   selectedChapter.chapterId,
        sectionName: selectedSection.sectionName,
        subjectName: selectedSubject.subjectName,
        chapterName: selectedChapter.chapterName,
        title:       title.trim(),
        description: desc.trim(),
        cloudinaryUrl:      url,
        cloudinaryPublicId: publicId,
        uploaderPhone: currentUser.phone,
        uploaderName:  currentUser.name,
      });

      setProgress('');
      onSuccess();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  return (
    <div className="notes-viewer-overlay" onClick={onClose}>
      <div className="notes-upload-modal" onClick={e => e.stopPropagation()}>
        <div className="notes-viewer-header">
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Upload Notes</span>
          <button className="notes-viewer-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="notes-upload-form">

          {/* Section */}
          <label className="notes-upload-label">Section</label>
          <select className="notes-upload-select" value={sectionId}
            onChange={e => { setSectionId(e.target.value); setSubjectId(''); setChapterId(''); }} required>
            <option value="">— Select section —</option>
            {syllabusData.map(s => <option key={s.sectionId} value={s.sectionId}>{s.sectionName}</option>)}
          </select>

          {/* Subject */}
          <label className="notes-upload-label">Subject</label>
          <select className="notes-upload-select" value={subjectId}
            onChange={e => { setSubjectId(e.target.value); setChapterId(''); }}
            disabled={!sectionId} required>
            <option value="">— Select subject —</option>
            {(selectedSection?.subjects || []).map(s => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
          </select>

          {/* Chapter */}
          <label className="notes-upload-label">Chapter</label>
          <select className="notes-upload-select" value={chapterId}
            onChange={e => setChapterId(e.target.value)}
            disabled={!subjectId} required>
            <option value="">— Select chapter —</option>
            {(selectedSubject?.chapters || []).map(c => <option key={c.chapterId} value={c.chapterId}>{c.chapterName}</option>)}
          </select>

          {/* Title */}
          <label className="notes-upload-label">Title</label>
          <input className="auth-input" placeholder="e.g. Complete chapter notes"
            value={title} onChange={e => setTitle(e.target.value)} required maxLength={80} />

          {/* Description */}
          <label className="notes-upload-label">Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <input className="auth-input" placeholder="Short description of the notes"
            value={desc} onChange={e => setDesc(e.target.value)} maxLength={160} />

          {/* File */}
          <label className="notes-upload-label">PDF File <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(max {MAX_MB}MB)</span></label>
          <label className="notes-file-picker">
            <input type="file" accept="application/pdf" onChange={handleFile} style={{ display: 'none' }} />
            <Upload size={16} />
            {file ? <span style={{ color: 'var(--text-primary)' }}>{file.name}</span> : <span>Click to select PDF</span>}
          </label>

          {err && <p className="auth-err">{err}</p>}
          {progress && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {progress}
            </p>
          )}

          <button className="auth-btn primary" type="submit" disabled={busy} style={{ marginTop: '0.25rem' }}>
            {busy ? 'Uploading…' : 'Submit for Review'}
          </button>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            You'll earn <strong>4 ✦ Sparks</strong> when the admin approves your notes.
          </p>
        </form>
      </div>
    </div>
  );
}
