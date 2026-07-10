import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { syllabusData } from '../data/syllabusData';
import { ChevronRight, Plus, Image as ImageIcon, Send, Loader2, X, Star, ArrowLeft, Download, ChevronDown, Sparkles } from 'lucide-react';
import { addStarBatchQuestion, getStarBatchQuestions, uploadImageToCloudinary } from '../services/starBatchSyllabusService';
import { useAuth } from '../auth/AuthContext';

// ── Quick-upload modal (FAB → full form with cascading selects) ──
function QuickUploadModal({ onClose, currentUser, onSuccess }) {
  // Cascading selection
  const [selSectionId, setSelSectionId] = useState('');
  const [selSubjectId, setSelSubjectId] = useState('');
  const [selChapterId, setSelChapterId] = useState('');

  // Topic fields
  const [topicName,    setTopicName]    = useState('');
  const [questionText, setQuestionText] = useState('');
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError,    setFormError]    = useState('');
  const [success,      setSuccess]      = useState(false);

  const fileRef = useRef(null);

  const activeSection = syllabusData.find(s => s.sectionId === selSectionId) || null;
  const activeSubject = activeSection?.subjects.find(s => s.subjectId === selSubjectId) || null;
  const activeChapter = activeSubject?.chapters.find(c => c.chapterId === selChapterId) || null;

  // Reset downstream when parent changes
  function pickSection(id) { setSelSectionId(id); setSelSubjectId(''); setSelChapterId(''); setFormError(''); }
  function pickSubject(id) { setSelSubjectId(id); setSelChapterId(''); setFormError(''); }
  function pickChapter(id) { setSelChapterId(id); setFormError(''); }

  const MAX_IMAGE_BYTES    = 5 * 1024 * 1024;
  const ALLOWED_TYPES      = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) { setFormError('Only JPEG, PNG, WEBP or GIF images are allowed.'); return; }
    if (file.size > MAX_IMAGE_BYTES)        { setFormError('Image must be under 5 MB.'); return; }
    setFormError('');
    setImageFile(file);
    const r = new FileReader();
    r.onloadend = () => setImagePreview(r.result);
    r.readAsDataURL(file);
  }

  function clearImage() { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ''; }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selChapterId)         return setFormError('Please select a chapter first.');
    if (!topicName.trim())     return setFormError('Topic name is required.');
    if (!questionText.trim() && !imageFile) return setFormError('Add question text or upload an image (or both).');

    setIsSubmitting(true); setFormError('');
    try {
      let imageUrl = null;
      if (imageFile) imageUrl = await uploadImageToCloudinary(imageFile);
      await addStarBatchQuestion(selChapterId, topicName, questionText, imageUrl, currentUser);
      setSuccess(true);
      setTimeout(() => { onSuccess(selChapterId); onClose(); }, 1200);
    } catch (err) {
      setFormError(err.message || 'Upload failed. Please try again.');
      setIsSubmitting(false);
    }
  }

  const locationComplete = selSectionId && selSubjectId && selChapterId;

  return (
    <>
      <style>{`
        .qu-overlay {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(0,0,0,0.82);
          backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
          display: flex; align-items: flex-end; justify-content: center;
          animation: quOverlayIn 0.2s ease;
        }
        @keyframes quOverlayIn { from { opacity:0 } to { opacity:1 } }
        @media (min-width: 640px) { .qu-overlay { align-items: center; padding: 1.5rem; } }

        .qu-modal {
          background: #0c0e16;
          border: 1px solid rgba(251,191,36,0.18);
          border-radius: 26px 26px 0 0;
          width: 100%; max-width: 520px;
          max-height: 94vh; overflow-y: auto;
          box-shadow: 0 -32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset;
          animation: quSheetUp 0.3s cubic-bezier(0.32,0.72,0,1);
          padding-bottom: env(safe-area-inset-bottom, 1.5rem);
        }
        @keyframes quSheetUp { from { transform:translateY(100%); opacity:0.4 } to { transform:translateY(0); opacity:1 } }
        @media (min-width: 640px) {
          .qu-modal { border-radius: 22px; animation: quPopIn 0.25s cubic-bezier(0.34,1.56,0.64,1); }
          @keyframes quPopIn { from { transform:scale(0.88); opacity:0 } to { transform:scale(1); opacity:1 } }
        }

        /* drag handle */
        .qu-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.12); margin: 0.85rem auto 0; }
        @media (min-width: 640px) { .qu-handle { display:none } }

        /* modal header */
        .qu-header {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;
          padding: 1.25rem 1.5rem 0;
        }
        .qu-header-icon {
          width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0;
          background: linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(245,158,11,0.08) 100%);
          border: 1px solid rgba(251,191,36,0.25);
          display: flex; align-items: center; justify-content: center;
        }
        .qu-header-text { flex: 1; min-width: 0; }
        .qu-header-title { font-size: 1.15rem; font-weight: 700; color: #f1f5f9; margin: 0 0 0.2rem; }
        .qu-header-sub   { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0; }
        .qu-close-btn {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5); border-radius: 10px;
          width: 36px; height: 36px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s; margin-top: 0.2rem;
        }
        .qu-close-btn:hover { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.35); color: #f87171; }

        /* section label */
        .qu-section-label {
          font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: rgba(255,255,255,0.3);
          margin: 0 0 0.6rem; display: flex; align-items: center; gap: 0.4rem;
        }
        .qu-section-label::before { content:''; flex:1; height:1px; background: rgba(255,255,255,0.07); }

        /* location grid */
        .qu-loc-grid {
          display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem;
        }
        @media (max-width: 480px) { .qu-loc-grid { grid-template-columns: 1fr; } }

        /* custom select */
        .qu-select-wrap { position: relative; }
        .qu-select {
          width: 100%; appearance: none; -webkit-appearance: none;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 10px; padding: 0.7rem 2.4rem 0.7rem 0.9rem;
          color: #e2e8f0; font-size: 0.88rem; outline: none;
          cursor: pointer; transition: border-color 0.2s, background 0.2s;
          min-height: 44px; box-sizing: border-box;
        }
        .qu-select:focus, .qu-select:hover { border-color: rgba(251,191,36,0.4); background: rgba(251,191,36,0.04); }
        .qu-select:disabled { opacity: 0.35; cursor: default; }
        .qu-select option { background: #1a1d2e; color: #e2e8f0; }
        .qu-select-icon {
          position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.35); pointer-events: none;
        }
        .qu-select.filled { border-color: rgba(251,191,36,0.35); color: #fbbf24; }

        /* location path chip */
        .qu-path-chip {
          display: flex; align-items: center; flex-wrap: wrap; gap: 0.3rem;
          background: rgba(251,191,36,0.06); border: 1px solid rgba(251,191,36,0.18);
          border-radius: 10px; padding: 0.6rem 0.9rem; font-size: 0.8rem;
          color: rgba(255,255,255,0.55); margin-top: 0.65rem;
        }
        .qu-path-chip strong { color: #fbbf24; font-weight: 600; }
        .qu-path-sep { color: rgba(255,255,255,0.2); font-size: 0.7rem; }

        /* form fields */
        .qu-input, .qu-textarea {
          width: 100%; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.09); border-radius: 10px;
          padding: 0.85rem 1rem; color: #f1f5f9; font-size: 0.95rem;
          outline: none; box-sizing: border-box; transition: border-color 0.2s;
          font-family: inherit;
        }
        .qu-input:focus, .qu-textarea:focus {
          border-color: rgba(251,191,36,0.45);
          box-shadow: 0 0 0 3px rgba(251,191,36,0.07);
        }
        .qu-input::placeholder, .qu-textarea::placeholder { color: rgba(255,255,255,0.25); }
        .qu-textarea { min-height: 100px; resize: vertical; line-height: 1.55; }

        /* image drop zone */
        .qu-drop-zone {
          border: 1.5px dashed rgba(255,255,255,0.12); border-radius: 12px;
          padding: 1.1rem 1rem; cursor: pointer; text-align: center;
          transition: all 0.22s; background: rgba(255,255,255,0.02);
          display: flex; align-items: center; justify-content: center; gap: 0.7rem;
          color: rgba(255,255,255,0.4); font-size: 0.88rem; min-height: 56px;
        }
        .qu-drop-zone:hover { border-color: #fbbf24; color: #fbbf24; background: rgba(251,191,36,0.04); }
        .qu-drop-zone.has-file { border-color: rgba(251,191,36,0.4); color: #fbbf24; background: rgba(251,191,36,0.06); }

        /* image preview */
        .qu-preview-wrap { position: relative; border-radius: 12px; overflow: hidden; }
        .qu-preview-img  { width: 100%; display: block; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); max-height: 240px; object-fit: contain; background: rgba(0,0,0,0.3); }
        .qu-preview-remove {
          position: absolute; top: 0.5rem; right: 0.5rem;
          background: rgba(0,0,0,0.75); border: none; border-radius: 50%;
          color: #fff; width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; backdrop-filter: blur(4px); transition: background 0.2s;
        }
        .qu-preview-remove:hover { background: rgba(239,68,68,0.8); }

        /* error */
        .qu-error {
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
          color: #fca5a5; border-radius: 10px; padding: 0.75rem 1rem;
          font-size: 0.85rem; display: flex; align-items: flex-start; gap: 0.5rem;
        }

        /* submit button */
        .qu-submit {
          width: 100%; border: none; border-radius: 13px; min-height: 54px;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #0a0a0a; font-size: 1rem; font-weight: 700;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          cursor: pointer; transition: all 0.2s; letter-spacing: 0.01em;
          box-shadow: 0 4px 20px rgba(251,191,36,0.2);
        }
        .qu-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(245,158,11,0.4); }
        .qu-submit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .qu-submit.success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 20px rgba(16,185,129,0.3); }

        /* divider */
        .qu-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 0; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes checkIn { from { transform: scale(0); } to { transform: scale(1); } }
      `}</style>

      <div className="qu-overlay" onClick={() => !isSubmitting && !success && onClose()}>
        <div className="qu-modal" onClick={e => e.stopPropagation()}>
          <div className="qu-handle" />

          {/* ── Header ── */}
          <div className="qu-header">
            <div className="qu-header-icon">
              <Sparkles size={20} color="#fbbf24" />
            </div>
            <div className="qu-header-text">
              <h2 className="qu-header-title">Add Topic</h2>
              <p className="qu-header-sub">Choose where it goes, then fill in the details</p>
            </div>
            <button className="qu-close-btn" onClick={onClose} disabled={isSubmitting} aria-label="Close">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* ── SECTION 1: Location ── */}
              <div>
                <p className="qu-section-label"><span>1</span> Where does this topic go?</p>

                <div className="qu-loc-grid">
                  {/* Section */}
                  <div className="qu-select-wrap">
                    <select
                      className={`qu-select${selSectionId ? ' filled' : ''}`}
                      value={selSectionId}
                      onChange={e => pickSection(e.target.value)}
                    >
                      <option value="">Section</option>
                      {syllabusData.map(s => (
                        <option key={s.sectionId} value={s.sectionId}>{s.sectionName}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="qu-select-icon" />
                  </div>

                  {/* Subject */}
                  <div className="qu-select-wrap">
                    <select
                      className={`qu-select${selSubjectId ? ' filled' : ''}`}
                      value={selSubjectId}
                      onChange={e => pickSubject(e.target.value)}
                      disabled={!activeSection}
                    >
                      <option value="">Subject</option>
                      {activeSection?.subjects.map(s => (
                        <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="qu-select-icon" />
                  </div>

                  {/* Chapter */}
                  <div className="qu-select-wrap">
                    <select
                      className={`qu-select${selChapterId ? ' filled' : ''}`}
                      value={selChapterId}
                      onChange={e => pickChapter(e.target.value)}
                      disabled={!activeSubject}
                    >
                      <option value="">Chapter</option>
                      {activeSubject?.chapters.map(c => (
                        <option key={c.chapterId} value={c.chapterId}>{c.chapterName}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="qu-select-icon" />
                  </div>
                </div>

                {/* Path pill — shown once all 3 selected */}
                {locationComplete && (
                  <div className="qu-path-chip">
                    <strong>{activeSection.sectionName}</strong>
                    <span className="qu-path-sep">›</span>
                    <strong>{activeSubject.subjectName}</strong>
                    <span className="qu-path-sep">›</span>
                    <strong>{activeChapter.chapterName}</strong>
                  </div>
                )}
              </div>

              <div className="qu-divider" />

              {/* ── SECTION 2: Topic details ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', opacity: locationComplete ? 1 : 0.45, pointerEvents: locationComplete ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                <p className="qu-section-label"><span>2</span> Topic details</p>

                {/* Topic name */}
                <input
                  type="text"
                  className="qu-input"
                  placeholder="Topic name  e.g. Important Numericals, Derivation of Lens Formula…"
                  value={topicName}
                  onChange={e => setTopicName(e.target.value)}
                  maxLength={120}
                  required={locationComplete}
                  tabIndex={locationComplete ? 0 : -1}
                />

                {/* Question / notes text */}
                <textarea
                  className="qu-textarea"
                  placeholder="Question text or study notes… (optional if you're uploading an image)"
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  maxLength={4000}
                  tabIndex={locationComplete ? 0 : -1}
                />

                {/* Image upload */}
                {imagePreview ? (
                  <div className="qu-preview-wrap">
                    <img src={imagePreview} alt="Preview" className="qu-preview-img" />
                    <button type="button" className="qu-preview-remove" onClick={clearImage} aria-label="Remove image">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className={`qu-drop-zone${imageFile ? ' has-file' : ''}`} style={{ cursor: locationComplete ? 'pointer' : 'default' }}>
                    <ImageIcon size={18} />
                    <span>{imageFile ? imageFile.name : 'Tap to attach a question image  (optional)'}</span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageChange}
                      tabIndex={-1}
                    />
                  </label>
                )}
              </div>

              {/* Error */}
              {formError && (
                <div className="qu-error">
                  <span style={{ flexShrink: 0, marginTop: '0.05rem' }}>⚠</span>
                  <span>{formError}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className={`qu-submit${success ? ' success' : ''}`}
                disabled={isSubmitting || success}
              >
                {success ? (
                  <span style={{ animation: 'checkIn 0.3s ease' }}>✓ Topic Added!</span>
                ) : isSubmitting ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</>
                ) : (
                  <><Send size={17} /> Add Topic</>
                )}
              </button>

              {/* Hint */}
              {!locationComplete && (
                <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                  Select section → subject → chapter to unlock the form
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function StarBatchSyllabusPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // 4-level drill-down
  const [sectionId, setSectionId] = useState(null);
  const [subjectId, setSubjectId] = useState(null);
  const [chapterId, setChapterId] = useState(null);

  // Questions cache keyed by chapterId
  const [chapterQuestions, setChapterQuestions] = useState({});
  const [topicsLoading,    setTopicsLoading]    = useState(false);
  const [topicsError,      setTopicsError]      = useState(null);

  // Topic popup
  const [viewingQuestion, setViewingQuestion] = useState(null);

  // Quick-upload FAB modal
  const [showQuickUpload, setShowQuickUpload] = useState(false);

  // Per-chapter add modal (kept for level-4 Add Topic button)
  const [addingToChapter, setAddingToChapter] = useState(null);
  const [topicName,    setTopicName]    = useState('');
  const [questionText, setQuestionText] = useState('');
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError,    setFormError]    = useState('');

  // Route guard
  useEffect(() => {
    if (!currentUser) navigate('/');
    else if (!currentUser.isStarBatch || !currentUser.hasUnlockedStarBatch) navigate('/star-batch');
  }, [currentUser, navigate]);

  // Auto-load topics when chapter selected
  useEffect(() => {
    if (!chapterId) return;
    if (chapterQuestions[chapterId] !== undefined) return;
    setTopicsLoading(true); setTopicsError(null);
    getStarBatchQuestions(chapterId)
      .then(q => setChapterQuestions(p => ({ ...p, [chapterId]: q })))
      .catch(() => setTopicsError('Failed to load topics. Tap to retry.'))
      .finally(() => setTopicsLoading(false));
  }, [chapterId]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeSection = syllabusData.find(s => s.sectionId === sectionId) || null;
  const activeSubject = activeSection?.subjects.find(s => s.subjectId === subjectId) || null;
  const activeChapter = activeSubject?.chapters.find(c => c.chapterId === chapterId) || null;

  if (!currentUser || !currentUser.isStarBatch || !currentUser.hasUnlockedStarBatch) return null;

  // ── Nav helpers ───────────────────────────────────────────────
  function goBack() {
    if (chapterId)  { setChapterId(null); setViewingQuestion(null); return; }
    if (subjectId)  { setSubjectId(null); return; }
    if (sectionId)  { setSectionId(null); return; }
  }
  function resetToSection(e) { e?.stopPropagation(); setSectionId(null); setSubjectId(null); setChapterId(null); setViewingQuestion(null); }
  function resetToSubject(e) { e?.stopPropagation(); setSubjectId(null); setChapterId(null); setViewingQuestion(null); }
  function resetToChapter(e) { e?.stopPropagation(); setChapterId(null); setViewingQuestion(null); }

  // ── After quick-upload success: refresh that chapter cache ────
  function handleQuickUploadSuccess(uploadedChapterId) {
    getStarBatchQuestions(uploadedChapterId)
      .then(q => setChapterQuestions(p => ({ ...p, [uploadedChapterId]: q })))
      .catch(() => {});
  }

  // ── Level-4 per-chapter add (still works from the chapter view) ─
  function openAddModal() {
    if (!activeChapter) return;
    setAddingToChapter(activeChapter);
    setTopicName(''); setQuestionText('');
    setImageFile(null); setImagePreview(null); setFormError('');
  }

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { setFormError('Only JPEG, PNG, WEBP or GIF allowed.'); e.target.value = ''; return; }
    if (file.size > MAX_IMAGE_BYTES)              { setFormError('Image must be under 5 MB.'); e.target.value = ''; return; }
    setFormError('');
    setImageFile(file);
    const r = new FileReader();
    r.onloadend = () => setImagePreview(r.result);
    r.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!topicName.trim()) return setFormError('Topic name is required.');
    if (!questionText.trim() && !imageFile) return setFormError('Add question text or an image.');
    setIsSubmitting(true); setFormError('');
    try {
      let imageUrl = null;
      if (imageFile) imageUrl = await uploadImageToCloudinary(imageFile);
      await addStarBatchQuestion(addingToChapter.chapterId, topicName, questionText, imageUrl, currentUser);
      const freshQ = await getStarBatchQuestions(addingToChapter.chapterId);
      setChapterQuestions(p => ({ ...p, [addingToChapter.chapterId]: freshQ }));
      setAddingToChapter(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Download image helper ─────────────────────────────────────
  async function downloadImage(url, name) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${name.replace(/\s+/g, '_')}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { window.open(url, '_blank'); }
  }

  const currentTopics = chapterId ? (chapterQuestions[chapterId] || []) : [];

  function retryTopics() {
    setChapterQuestions(p => { const n = { ...p }; delete n[chapterId]; return n; });
    setTopicsError(null); setTopicsLoading(true);
    getStarBatchQuestions(chapterId)
      .then(q => setChapterQuestions(p => ({ ...p, [chapterId]: q })))
      .catch(() => setTopicsError('Failed to load topics. Tap to retry.'))
      .finally(() => setTopicsLoading(false));
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ animation: 'fade-in 0.4s ease', paddingBottom: '5rem' }}>
      <style>{`
        /* ── Layout ─────────────────────────────────── */
        .sb-page-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
        .sb-back-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 8px; padding: 0.5rem; cursor: pointer; display: flex; align-items: center; transition: all 0.2s; min-width: 44px; min-height: 44px; justify-content: center; flex-shrink: 0; }
        .sb-back-btn:hover { background: rgba(251,191,36,0.1); border-color: #fbbf24; color: #fbbf24; }
        .sb-breadcrumb { display: flex; align-items: center; gap: 0.25rem; flex-wrap: wrap; margin-bottom: 1.25rem; font-size: 0.82rem; }
        .sb-crumb-btn { background: none; border: none; color: #fbbf24; cursor: pointer; padding: 0.3rem 0.4rem; border-radius: 4px; font-size: 0.82rem; transition: background 0.2s; min-height: 34px; }
        .sb-crumb-btn:hover { background: rgba(251,191,36,0.1); }
        .sb-crumb-current { color: rgba(255,255,255,0.55); padding: 0.3rem 0.4rem; font-size: 0.82rem; }
        .sb-crumb-sep { color: rgba(255,255,255,0.25); flex-shrink: 0; }

        /* ── Rows ───────────────────────────────────── */
        .sb-row { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 1rem 1.2rem; margin-bottom: 0.65rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; cursor: pointer; transition: all 0.2s; width: 100%; text-align: left; color: #fff; min-height: 60px; -webkit-tap-highlight-color: transparent; }
        .sb-row:hover, .sb-row:active { background: rgba(251,191,36,0.05); border-color: rgba(251,191,36,0.25); }
        .sb-row-title { font-weight: 500; font-size: 0.97rem; color: #e2e8f0; line-height: 1.3; }
        .sb-row-count { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin-top: 0.2rem; }

        /* ── Chapter header bar ─────────────────────── */
        .sb-chapter-bar { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; }
        .sb-chapter-bar-title { font-size: 1rem; font-weight: 600; color: #e2e8f0; line-height: 1.3; }
        .sb-add-btn { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border: none; color: #000; border-radius: 10px; height: 40px; padding: 0 1rem; display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; white-space: nowrap; flex-shrink: 0; }
        .sb-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(245,158,11,0.35); }

        /* ── Topic pills ────────────────────────────── */
        .sb-topic-pill { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; background: rgba(251,191,36,0.04); border: 1px solid rgba(251,191,36,0.15); border-radius: 12px; padding: 0.9rem 1rem; cursor: pointer; transition: all 0.22s ease; width: 100%; text-align: left; min-height: 56px; -webkit-tap-highlight-color: transparent; margin-bottom: 0.6rem; }
        .sb-topic-pill:hover, .sb-topic-pill:active { background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.35); transform: translateY(-1px); }
        .sb-topic-pill-left { display: flex; align-items: center; gap: 0.65rem; flex: 1; min-width: 0; }
        .sb-topic-dot { width: 8px; height: 8px; border-radius: 50%; background: #fbbf24; flex-shrink: 0; box-shadow: 0 0 8px rgba(251,191,36,0.6); }
        .sb-topic-name { font-weight: 600; color: #fbbf24; font-size: 0.92rem; line-height: 1.3; }
        .sb-topic-meta { font-size: 0.72rem; color: rgba(255,255,255,0.38); margin-top: 0.15rem; }
        .sb-topic-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
        .sb-topic-badge { font-size: 0.68rem; color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.07); padding: 0.2rem 0.5rem; border-radius: 20px; white-space: nowrap; }
        .sb-topic-chevron { color: rgba(251,191,36,0.55); flex-shrink: 0; }

        /* ── View popup ─────────────────────────────── */
        .sb-view-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.78); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; align-items: flex-end; justify-content: center; z-index: 9999; padding: 0; animation: overlayIn 0.18s ease; }
        @keyframes overlayIn { from { opacity:0 } to { opacity:1 } }
        @media (min-width: 600px) { .sb-view-overlay { align-items: center; padding: 1.5rem; } }
        .sb-view-modal { background: #0f1117; border: 1px solid rgba(251,191,36,0.2); border-radius: 22px 22px 0 0; width: 100%; max-width: 540px; max-height: 88vh; overflow-y: auto; padding: 0 0 2rem; box-shadow: 0 -24px 60px rgba(0,0,0,0.6); animation: sheetUp 0.28s cubic-bezier(0.32,0.72,0,1); }
        @keyframes sheetUp { from { transform:translateY(100%); opacity:0.5 } to { transform:translateY(0); opacity:1 } }
        @media (min-width: 600px) { .sb-view-modal { border-radius: 20px; animation: popIn 0.22s cubic-bezier(0.34,1.56,0.64,1); } }
        @keyframes popIn { from { transform:scale(0.9); opacity:0 } to { transform:scale(1); opacity:1 } }
        .sb-view-handle { width: 36px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; margin: 0.9rem auto 0; }
        @media (min-width: 600px) { .sb-view-handle { display:none } }
        .sb-view-header { position: sticky; top: 0; background: #0f1117; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 1rem 1.25rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
        .sb-view-title  { font-size: 1.1rem; font-weight: 700; color: #fbbf24; margin: 0; line-height: 1.3; }
        .sb-view-author { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
        .sb-view-close  { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); border-radius: 50%; width: 32px; height: 32px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .sb-view-close:hover { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #f87171; }
        .sb-view-body { padding: 1.25rem 1.25rem 0; }
        .sb-view-text  { color: #e2e8f0; font-size: 0.93rem; line-height: 1.65; white-space: pre-wrap; margin: 0 0 1.25rem; }
        .sb-view-img   { width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); display: block; margin-bottom: 1rem; }
        .sb-dl-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.25); color: #fbbf24; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: all 0.2s; width: 100%; margin-top: 0.25rem; }
        .sb-dl-btn:hover { background: rgba(251,191,36,0.18); border-color: #fbbf24; }

        /* ── Misc ───────────────────────────────────── */
        .sb-empty { color: rgba(255,255,255,0.3); font-size: 0.85rem; font-style: italic; text-align: center; padding: 2rem 0; }
        .sb-error-box { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.2); color: #fca5a5; border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.88rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }

        /* ── Simple inline add modal (chapter view) ─── */
        .sb-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: flex-end; justify-content: center; z-index: 9999; padding: 0; }
        @media (min-width: 600px) { .sb-overlay { align-items: center; padding: 1rem; } }
        .sb-modal { background: #0e1117; border: 1px solid rgba(251,191,36,0.25); border-radius: 22px 22px 0 0; width: 100%; max-width: 490px; padding: 1.5rem 1.25rem 2rem; box-shadow: 0 -20px 60px rgba(0,0,0,0.5); max-height: 92vh; overflow-y: auto; }
        @media (min-width: 600px) { .sb-modal { border-radius: 18px; padding: 1.75rem; } }
        .sb-modal-handle { width: 36px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; margin: 0 auto 1.25rem; }
        @media (min-width: 600px) { .sb-modal-handle { display: none; } }
        .sb-modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
        .sb-modal-title { font-size: 1.1rem; font-weight: 600; color: #fbbf24; margin: 0; }
        .sb-modal-sub   { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
        .sb-field { width: 100%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0.85rem 1rem; color: #fff; outline: none; transition: border-color 0.2s; box-sizing: border-box; margin-bottom: 1rem; font-size: 1rem; font-family: inherit; }
        .sb-field:focus { border-color: rgba(251,191,36,0.5); box-shadow: 0 0 0 2px rgba(251,191,36,0.08); }
        .sb-field::placeholder { color: rgba(255,255,255,0.3); }
        .sb-textarea { min-height: 90px; resize: vertical; }
        .sb-file-label { display: flex; align-items: center; justify-content: center; gap: 0.6rem; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); border-radius: 10px; padding: 1rem; cursor: pointer; color: rgba(255,255,255,0.5); font-size: 0.9rem; transition: all 0.2s; margin-bottom: 1rem; min-height: 52px; }
        .sb-file-label:hover { border-color: #fbbf24; color: #fbbf24; }
        .sb-submit-btn { width: 100%; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #000; border: none; border-radius: 12px; padding: 1rem; font-weight: 600; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s; min-height: 52px; }
        .sb-submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(245,158,11,0.3); }
        .sb-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .sb-error { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.2); color: #fca5a5; border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.88rem; margin-bottom: 1rem; }

        /* ── Floating Upload Button (FAB) ───────────── */
        .sb-fab {
          position: fixed; bottom: 1.5rem; right: 1.25rem; z-index: 1000;
          width: 58px; height: 58px; border-radius: 18px;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          border: none; color: #000; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
          box-shadow: 0 8px 30px rgba(245,158,11,0.45), 0 2px 8px rgba(0,0,0,0.3);
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
          -webkit-tap-highlight-color: transparent;
        }
        .sb-fab:hover { transform: scale(1.08) translateY(-2px); box-shadow: 0 14px 40px rgba(245,158,11,0.55); }
        .sb-fab:active { transform: scale(0.96); }
        .sb-fab-label { font-size: 0.52rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; line-height: 1; }
        .sb-fab-pulse {
          position: absolute; inset: -3px; border-radius: 20px;
          border: 2px solid rgba(251,191,36,0.4);
          animation: fabPulse 2.5s ease-in-out infinite;
        }
        @keyframes fabPulse { 0%, 100% { opacity:0.6; transform:scale(1) } 50% { opacity:0; transform:scale(1.18) } }

        @keyframes fade-in { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Page Header ── */}
      <div className="sb-page-header">
        {sectionId && (
          <button className="sb-back-btn" onClick={goBack} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
        )}
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.35rem', fontWeight: 700 }}>
            <Star size={20} color="#fbbf24" /> Elite Syllabus
          </h2>
          <p style={{ margin: '0.2rem 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
            Browse or tap <strong style={{ color: '#fbbf24' }}>+</strong> to upload from anywhere
          </p>
        </div>
      </div>

      {/* ── Breadcrumb ── */}
      <div className="sb-breadcrumb">
        <button className="sb-crumb-btn" onClick={resetToSection}>All Sections</button>
        {activeSection && (
          <>
            <ChevronRight size={12} className="sb-crumb-sep" />
            {(activeSubject || chapterId)
              ? <button className="sb-crumb-btn" onClick={resetToSubject}>{activeSection.sectionName}</button>
              : <span className="sb-crumb-current">{activeSection.sectionName}</span>
            }
          </>
        )}
        {activeSubject && (
          <>
            <ChevronRight size={12} className="sb-crumb-sep" />
            {chapterId
              ? <button className="sb-crumb-btn" onClick={resetToChapter}>{activeSubject.subjectName}</button>
              : <span className="sb-crumb-current">{activeSubject.subjectName}</span>
            }
          </>
        )}
        {activeChapter && (
          <>
            <ChevronRight size={12} className="sb-crumb-sep" />
            <span className="sb-crumb-current">{activeChapter.chapterName}</span>
          </>
        )}
      </div>

      {/* ── Level 1: Sections ── */}
      {!activeSection && (
        <div>
          {syllabusData.map(section => (
            <button key={section.sectionId} className="sb-row"
              onClick={() => { setSectionId(section.sectionId); setSubjectId(null); setChapterId(null); }}>
              <div>
                <div className="sb-row-title">{section.sectionName}</div>
                <div className="sb-row-count">{section.subjects.length} subjects</div>
              </div>
              <ChevronRight size={18} color="#fbbf24" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}

      {/* ── Level 2: Subjects ── */}
      {activeSection && !activeSubject && (
        <div>
          {activeSection.subjects.map(subject => (
            <button key={subject.subjectId} className="sb-row"
              onClick={() => { setSubjectId(subject.subjectId); setChapterId(null); }}>
              <div>
                <div className="sb-row-title">{subject.subjectName}</div>
                <div className="sb-row-count">{subject.chapters.length} chapters</div>
              </div>
              <ChevronRight size={18} color="#fbbf24" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}

      {/* ── Level 3: Chapters ── */}
      {activeSubject && !chapterId && (
        <div>
          {activeSubject.chapters.map((chapter, idx) => (
            <button key={chapter.chapterId} className="sb-row"
              onClick={() => { setChapterId(chapter.chapterId); setViewingQuestion(null); }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', fontWeight: 600, flexShrink: 0 }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div className="sb-row-title">{chapter.chapterName}</div>
                  {chapterQuestions[chapter.chapterId] !== undefined && (
                    <div className="sb-row-count">
                      {chapterQuestions[chapter.chapterId].length} topic{chapterQuestions[chapter.chapterId].length !== 1 ? 's' : ''} added
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight size={18} color="#fbbf24" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}

      {/* ── Level 4: Topics ── */}
      {activeChapter && chapterId && (
        <div>
          <div className="sb-chapter-bar">
            <div className="sb-chapter-bar-title">{activeChapter.chapterName}</div>
            <button className="sb-add-btn" onClick={openAddModal}>
              <Plus size={16} /> Add Topic
            </button>
          </div>

          {topicsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', padding: '1.5rem 0' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading topics…
            </div>
          ) : topicsError ? (
            <div className="sb-error-box">
              <span>{topicsError}</span>
              <button type="button" onClick={retryTopics}
                style={{ background: 'none', border: 'none', color: '#fca5a5', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}>
                Retry
              </button>
            </div>
          ) : currentTopics.length > 0 ? (
            currentTopics.map(q => (
              <button key={q.id} className="sb-topic-pill" onClick={() => setViewingQuestion(q)}>
                <div className="sb-topic-pill-left">
                  <div className="sb-topic-dot" />
                  <div style={{ minWidth: 0 }}>
                    <div className="sb-topic-name">{q.topicName}</div>
                    <div className="sb-topic-meta">by {q.authorName}</div>
                  </div>
                </div>
                <div className="sb-topic-right">
                  {q.imageUrl && <span className="sb-topic-badge">📷 img</span>}
                  <ChevronRight size={16} className="sb-topic-chevron" />
                </div>
              </button>
            ))
          ) : (
            <div className="sb-empty">
              No topics yet for this chapter.<br />
              Tap <strong style={{ color: '#fbbf24' }}>+ Add Topic</strong> above or the <strong style={{ color: '#fbbf24' }}>+ button</strong> at the bottom!
            </div>
          )}
        </div>
      )}

      {/* ── View Question Popup ── */}
      {viewingQuestion && (
        <div className="sb-view-overlay" onClick={() => setViewingQuestion(null)}>
          <div className="sb-view-modal" onClick={e => e.stopPropagation()}>
            <div className="sb-view-handle" />
            <div className="sb-view-header">
              <div style={{ minWidth: 0 }}>
                <p className="sb-view-title">{viewingQuestion.topicName}</p>
                <p className="sb-view-author">Added by {viewingQuestion.authorName}</p>
              </div>
              <button className="sb-view-close" onClick={() => setViewingQuestion(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="sb-view-body">
              {viewingQuestion.questionText && (
                <p className="sb-view-text">{viewingQuestion.questionText}</p>
              )}
              {viewingQuestion.imageUrl && (
                <>
                  <img src={viewingQuestion.imageUrl} alt={viewingQuestion.topicName} className="sb-view-img" loading="lazy" />
                  <button className="sb-dl-btn" onClick={() => downloadImage(viewingQuestion.imageUrl, viewingQuestion.topicName)}>
                    <Download size={16} /> Download Image
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Inline Add Modal (from level-4 chapter view) ── */}
      {addingToChapter && (
        <div className="sb-overlay" onClick={() => !isSubmitting && setAddingToChapter(null)}>
          <div className="sb-modal" onClick={e => e.stopPropagation()}>
            <div className="sb-modal-handle" />
            <div className="sb-modal-header">
              <div>
                <h3 className="sb-modal-title">Add Topic</h3>
                <p className="sb-modal-sub">{addingToChapter.chapterName}</p>
              </div>
              <button onClick={() => !isSubmitting && setAddingToChapter(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', flexShrink: 0 }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <input type="text" className="sb-field" placeholder="Topic Name" value={topicName}
                onChange={e => setTopicName(e.target.value)} maxLength={120} required />
              <textarea className="sb-field sb-textarea" placeholder="Question or notes… (optional if uploading image)"
                value={questionText} onChange={e => setQuestionText(e.target.value)} maxLength={4000} />
              <label className="sb-file-label">
                <ImageIcon size={18} />
                {imageFile ? imageFile.name : 'Upload Image (optional)'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
              </label>
              {imagePreview && (
                <div style={{ marginBottom: '1rem', position: 'relative' }}>
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                    style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', color: '#fff', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={13} />
                  </button>
                </div>
              )}
              {formError && <div className="sb-error">{formError}</div>}
              <button type="submit" className="sb-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Send size={17} /> Add Topic</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Quick Upload FAB ── */}
      <button
        className="sb-fab"
        onClick={() => setShowQuickUpload(true)}
        aria-label="Quick upload topic"
        title="Upload a topic anywhere"
      >
        <div className="sb-fab-pulse" />
        <Plus size={24} strokeWidth={2.5} />
        <span className="sb-fab-label">Upload</span>
      </button>

      {/* ── Quick Upload Modal ── */}
      {showQuickUpload && (
        <QuickUploadModal
          onClose={() => setShowQuickUpload(false)}
          currentUser={currentUser}
          onSuccess={handleQuickUploadSuccess}
        />
      )}
    </div>
  );
}
