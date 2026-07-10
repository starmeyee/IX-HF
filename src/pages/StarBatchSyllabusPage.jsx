import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { syllabusData } from '../data/syllabusData';
import { ChevronRight, Plus, Image as ImageIcon, Send, Loader2, X, Star, ArrowLeft, Download } from 'lucide-react';
import { addStarBatchQuestion, getStarBatchQuestions, uploadImageToCloudinary } from '../services/starBatchSyllabusService';
import { useAuth } from '../auth/AuthContext';

export default function StarBatchSyllabusPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // 4-level drill-down: section → subject → chapter → topics
  const [sectionId, setSectionId]   = useState(null);
  const [subjectId, setSubjectId]   = useState(null);
  const [chapterId, setChapterId]   = useState(null); // level 4 entry

  // Questions cache keyed by chapterId
  const [chapterQuestions, setChapterQuestions] = useState({});
  const [topicsLoading, setTopicsLoading]       = useState(false);
  const [topicsError, setTopicsError]           = useState(null);

  // Topic popup — holds the question object being viewed
  const [viewingQuestion, setViewingQuestion] = useState(null);

  // Add Question Modal state
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

  // Auto-load topics when a chapter is selected (level 4)
  useEffect(() => {
    if (!chapterId) return;
    if (chapterQuestions[chapterId] !== undefined) return; // already cached
    setTopicsLoading(true);
    setTopicsError(null);
    getStarBatchQuestions(chapterId)
      .then(q => setChapterQuestions(p => ({ ...p, [chapterId]: q })))
      .catch(() => setTopicsError('Failed to load topics. Tap to retry.'))
      .finally(() => setTopicsLoading(false));
  }, [chapterId]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeSection = syllabusData.find(s => s.sectionId === sectionId) || null;
  const activeSubject = activeSection?.subjects.find(s => s.subjectId === subjectId) || null;
  const activeChapter = activeSubject?.chapters.find(c => c.chapterId === chapterId) || null;

  if (!currentUser || !currentUser.isStarBatch || !currentUser.hasUnlockedStarBatch) return null;

  // ── Navigation helpers ────────────────────────────────────
  function goBack() {
    if (chapterId)  { setChapterId(null); setViewingQuestion(null); return; }
    if (subjectId)  { setSubjectId(null); return; }
    if (sectionId)  { setSectionId(null); return; }
  }

  function resetToSection(e) { e?.stopPropagation(); setSectionId(null); setSubjectId(null); setChapterId(null); setViewingQuestion(null); }
  function resetToSubject(e) { e?.stopPropagation(); setSubjectId(null); setChapterId(null); setViewingQuestion(null); }
  function resetToChapter(e) { e?.stopPropagation(); setChapterId(null); setViewingQuestion(null); }

  function selectChapter(cid) {
    setChapterId(cid);
    setViewingQuestion(null);
  }

  // ── Add-question modal helpers ────────────────────────────
  function openAddModal() {
    if (!activeChapter) return;
    setAddingToChapter(activeChapter);
    setTopicName(''); setQuestionText('');
    setImageFile(null); setImagePreview(null);
    setFormError('');
  }

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFormError('Unsupported file type. Please upload a JPEG, PNG, WEBP, or GIF image.');
      e.target.value = ''; return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFormError(`Image is too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)}MB).`);
      e.target.value = ''; return;
    }
    setFormError('');
    setImageFile(file);
    const r = new FileReader();
    r.onloadend = () => setImagePreview(r.result);
    r.onerror   = () => setFormError('Failed to read the image. Please try another file.');
    r.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!topicName.trim()) return setFormError('Topic name is required.');
    if (!questionText.trim() && !imageFile) return setFormError('Add a question or upload an image.');
    setIsSubmitting(true); setFormError('');
    try {
      let imageUrl = null;
      if (imageFile) imageUrl = await uploadImageToCloudinary(imageFile);
      await addStarBatchQuestion(addingToChapter.chapterId, topicName, questionText, imageUrl, currentUser);
      // Refresh topics list for this chapter
      const freshQ = await getStarBatchQuestions(addingToChapter.chapterId);
      setChapterQuestions(p => ({ ...p, [addingToChapter.chapterId]: freshQ }));
      setAddingToChapter(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Download image helper ─────────────────────────────────
  async function downloadImage(url, name) {
    try {
      const res  = await fetch(url);
      const blob = await res.blob();
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `${name.replace(/\s+/g, '_')}.jpg`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // fallback: open in new tab
      window.open(url, '_blank');
    }
  }

  // ── Current topics (level 4) ──────────────────────────────
  const currentTopics = chapterId ? (chapterQuestions[chapterId] || []) : [];

  // ── Retry load ────────────────────────────────────────────
  function retryTopics() {
    setChapterQuestions(p => { const n = { ...p }; delete n[chapterId]; return n; });
    setTopicsError(null);
    setTopicsLoading(true);
    getStarBatchQuestions(chapterId)
      .then(q => setChapterQuestions(p => ({ ...p, [chapterId]: q })))
      .catch(() => setTopicsError('Failed to load topics. Tap to retry.'))
      .finally(() => setTopicsLoading(false));
  }

  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ animation: 'fade-in 0.4s ease' }}>
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

        /* ── Section / Subject / Chapter rows ────────── */
        .sb-row { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 1rem 1.2rem; margin-bottom: 0.65rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; cursor: pointer; transition: all 0.2s; width: 100%; text-align: left; color: #fff; min-height: 60px; -webkit-tap-highlight-color: transparent; }
        .sb-row:hover, .sb-row:active { background: rgba(251,191,36,0.05); border-color: rgba(251,191,36,0.25); }
        .sb-row-title { font-weight: 500; font-size: 0.97rem; color: #e2e8f0; line-height: 1.3; }
        .sb-row-count { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin-top: 0.2rem; }

        /* ── Level-4 header bar (chapter view) ───────── */
        .sb-chapter-bar { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; }
        .sb-chapter-bar-title { font-size: 1rem; font-weight: 600; color: #e2e8f0; line-height: 1.3; }
        .sb-add-btn { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border: none; color: #000; border-radius: 10px; height: 40px; padding: 0 1rem; display: flex; align-items: center; gap: 0.4rem; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; white-space: nowrap; flex-shrink: 0; }
        .sb-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(245,158,11,0.35); }

        /* ── Topic pills (level 4 list) ──────────────── */
        .sb-topic-pill { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; background: rgba(251,191,36,0.04); border: 1px solid rgba(251,191,36,0.15); border-radius: 12px; padding: 0.9rem 1rem; cursor: pointer; transition: all 0.22s ease; width: 100%; text-align: left; min-height: 56px; -webkit-tap-highlight-color: transparent; margin-bottom: 0.6rem; }
        .sb-topic-pill:hover, .sb-topic-pill:active { background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.35); transform: translateY(-1px); }
        .sb-topic-pill-left { display: flex; align-items: center; gap: 0.65rem; flex: 1; min-width: 0; }
        .sb-topic-dot { width: 8px; height: 8px; border-radius: 50%; background: #fbbf24; flex-shrink: 0; box-shadow: 0 0 8px rgba(251,191,36,0.6); }
        .sb-topic-name { font-weight: 600; color: #fbbf24; font-size: 0.92rem; line-height: 1.3; }
        .sb-topic-meta { font-size: 0.72rem; color: rgba(255,255,255,0.38); margin-top: 0.15rem; }
        .sb-topic-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
        .sb-topic-badge { font-size: 0.68rem; color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.07); padding: 0.2rem 0.5rem; border-radius: 20px; white-space: nowrap; }
        .sb-topic-chevron { color: rgba(251,191,36,0.55); flex-shrink: 0; }

        /* ── View-question popup ─────────────────────── */
        .sb-view-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.78); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; align-items: flex-end; justify-content: center; z-index: 9999; padding: 0; animation: overlayIn 0.18s ease; }
        @keyframes overlayIn { from { opacity:0; } to { opacity:1; } }
        @media (min-width: 600px) { .sb-view-overlay { align-items: center; padding: 1.5rem; } }
        .sb-view-modal { background: #0f1117; border: 1px solid rgba(251,191,36,0.2); border-radius: 22px 22px 0 0; width: 100%; max-width: 540px; max-height: 88vh; overflow-y: auto; padding: 0 0 2rem; box-shadow: 0 -24px 60px rgba(0,0,0,0.6); animation: sheetUp 0.28s cubic-bezier(0.32,0.72,0,1); }
        @keyframes sheetUp { from { transform: translateY(100%); opacity:0.5; } to { transform: translateY(0); opacity:1; } }
        @media (min-width: 600px) { .sb-view-modal { border-radius: 20px; animation: popIn 0.22s cubic-bezier(0.34,1.56,0.64,1); } }
        @keyframes popIn { from { transform: scale(0.9); opacity:0; } to { transform: scale(1); opacity:1; } }
        .sb-view-handle { width: 36px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; margin: 0.9rem auto 0; }
        @media (min-width: 600px) { .sb-view-handle { display: none; } }
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

        /* ── Misc ────────────────────────────────────── */
        .sb-empty { color: rgba(255,255,255,0.3); font-size: 0.85rem; font-style: italic; text-align: center; padding: 2rem 0; }

        /* ── Add-question modal ──────────────────────── */
        .sb-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: flex-end; justify-content: center; z-index: 9999; padding: 0; }
        @media (min-width: 600px) { .sb-overlay { align-items: center; padding: 1rem; } }
        .sb-modal { background: #0e1117; border: 1px solid rgba(251,191,36,0.25); border-radius: 22px 22px 0 0; width: 100%; max-width: 490px; padding: 1.5rem 1.25rem 2rem; box-shadow: 0 -20px 60px rgba(0,0,0,0.5); max-height: 92vh; overflow-y: auto; }
        @media (min-width: 600px) { .sb-modal { border-radius: 18px; padding: 1.75rem; } }
        .sb-modal-handle { width: 36px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; margin: 0 auto 1.25rem; }
        @media (min-width: 600px) { .sb-modal-handle { display: none; } }
        .sb-modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
        .sb-modal-title { font-size: 1.1rem; font-weight: 600; color: #fbbf24; margin: 0; line-height: 1.3; }
        .sb-modal-sub   { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
        .sb-field { width: 100%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 0.85rem 1rem; color: #fff; outline: none; transition: border-color 0.2s; box-sizing: border-box; margin-bottom: 1rem; font-size: 1rem; }
        .sb-field:focus { border-color: rgba(251,191,36,0.5); box-shadow: 0 0 0 2px rgba(251,191,36,0.08); }
        .sb-field::placeholder { color: rgba(255,255,255,0.3); }
        .sb-textarea { min-height: 90px; resize: vertical; }
        .sb-file-label { display: flex; align-items: center; justify-content: center; gap: 0.6rem; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); border-radius: 10px; padding: 1rem; cursor: pointer; color: rgba(255,255,255,0.5); font-size: 0.9rem; transition: all 0.2s; margin-bottom: 1rem; min-height: 52px; }
        .sb-file-label:hover { border-color: #fbbf24; color: #fbbf24; background: rgba(251,191,36,0.04); }
        .sb-submit-btn { width: 100%; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #000; border: none; border-radius: 12px; padding: 1rem; font-weight: 600; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s; min-height: 52px; }
        .sb-submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(245,158,11,0.3); }
        .sb-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .sb-error { background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.2); color: #fca5a5; border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.88rem; margin-bottom: 1rem; }

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
            Browse sections → subject → chapter → topics
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
            <button
              key={section.sectionId}
              className="sb-row"
              onClick={() => { setSectionId(section.sectionId); setSubjectId(null); setChapterId(null); }}
            >
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
            <button
              key={subject.subjectId}
              className="sb-row"
              onClick={() => { setSubjectId(subject.subjectId); setChapterId(null); }}
            >
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
            <button
              key={chapter.chapterId}
              className="sb-row"
              onClick={() => selectChapter(chapter.chapterId)}
            >
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

      {/* ── Level 4: Topics inside a chapter ── */}
      {activeChapter && chapterId && (
        <div>
          {/* Chapter header bar with + Add button */}
          <div className="sb-chapter-bar">
            <div className="sb-chapter-bar-title">{activeChapter.chapterName}</div>
            <button className="sb-add-btn" onClick={openAddModal}>
              <Plus size={16} /> Add Topic
            </button>
          </div>

          {/* Topics list */}
          {topicsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', padding: '1.5rem 0' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading topics…
            </div>
          ) : topicsError ? (
            <div className="sb-error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <span>{topicsError}</span>
              <button
                type="button"
                onClick={retryTopics}
                style={{ background: 'none', border: 'none', color: '#fca5a5', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}
              >
                Retry
              </button>
            </div>
          ) : currentTopics.length > 0 ? (
            currentTopics.map(q => (
              <button
                key={q.id}
                className="sb-topic-pill"
                onClick={() => setViewingQuestion(q)}
              >
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
              Tap <strong style={{ color: '#fbbf24' }}>+ Add Topic</strong> to be the first!
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
                  <img
                    src={viewingQuestion.imageUrl}
                    alt={viewingQuestion.topicName}
                    className="sb-view-img"
                    loading="lazy"
                  />
                  <button
                    className="sb-dl-btn"
                    onClick={() => downloadImage(viewingQuestion.imageUrl, viewingQuestion.topicName)}
                  >
                    <Download size={16} /> Download Image
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add Question Modal ── */}
      {addingToChapter && (
        <div className="sb-overlay" onClick={() => !isSubmitting && setAddingToChapter(null)}>
          <div className="sb-modal" onClick={e => e.stopPropagation()}>
            <div className="sb-modal-handle" />
            <div className="sb-modal-header">
              <div>
                <h3 className="sb-modal-title">Add Topic / Question</h3>
                <p className="sb-modal-sub">{addingToChapter.chapterName}</p>
              </div>
              <button onClick={() => !isSubmitting && setAddingToChapter(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', flexShrink: 0 }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <input
                type="text"
                className="sb-field"
                placeholder="Topic Name (e.g. Important Numericals)"
                value={topicName}
                onChange={e => setTopicName(e.target.value)}
                maxLength={120}
                required
              />
              <textarea
                className="sb-field sb-textarea"
                placeholder="Type the question or notes here… (optional if uploading image)"
                value={questionText}
                onChange={e => setQuestionText(e.target.value)}
                maxLength={4000}
              />
              <label className="sb-file-label">
                <ImageIcon size={18} />
                {imageFile ? imageFile.name : 'Upload Question Image (optional)'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
              </label>

              {imagePreview && (
                <div style={{ marginBottom: '1rem', position: 'relative' }}>
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', color: '#fff', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {formError && <div className="sb-error">{formError}</div>}

              <button type="submit" className="sb-submit-btn" disabled={isSubmitting}>
                {isSubmitting
                  ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                  : <><Send size={17} /> Add Topic</>
                }
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
