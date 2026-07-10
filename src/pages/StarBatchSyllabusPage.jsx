import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { syllabusData } from '../data/syllabusData';
import { ChevronRight, Plus, Image as ImageIcon, Send, Loader2, X, Star, ArrowLeft } from 'lucide-react';
import { addStarBatchQuestion, getStarBatchQuestions, uploadImageToCloudinary } from '../services/starBatchSyllabusService';
import { useAuth } from '../auth/AuthContext';

export default function StarBatchSyllabusPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Drill-down state — same pattern as SyllabusPage
  const [sectionId, setSectionId] = useState(null);
  const [subjectId, setSubjectId] = useState(null);
  const [openChapterId, setOpenChapterId] = useState(null);

  // Questions cache keyed by chapterId
  const [chapterQuestions, setChapterQuestions] = useState({});
  const [loadingChapters, setLoadingChapters] = useState({});
  const [chapterLoadErrors, setChapterLoadErrors] = useState({});

  // Which question card is expanded (shows text + image)
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);

  // Add Question Modal state
  const [addingToChapter, setAddingToChapter] = useState(null);
  const [topicName, setTopicName] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Route guard: only allow-listed (isStarBatch) users who have also
  // unlocked via the code may view or edit this page. Mirrors the check in
  // StarBatchPage — do not access this page directly without both being
  // admin-approved and having entered the code first.
  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    } else if (!currentUser.isStarBatch || !currentUser.hasUnlockedStarBatch) {
      navigate('/star-batch');
    }
  }, [currentUser, navigate]);

  const activeSection = syllabusData.find(s => s.sectionId === sectionId) || null;
  const activeSubject = activeSection?.subjects.find(s => s.subjectId === subjectId) || null;

  if (!currentUser || !currentUser.isStarBatch || !currentUser.hasUnlockedStarBatch) return null;

  // Load questions when a chapter is expanded
  async function toggleChapter(chapterId) {
    if (openChapterId === chapterId) { setOpenChapterId(null); setExpandedQuestionId(null); return; }
    setOpenChapterId(chapterId);
    setExpandedQuestionId(null);
    if (!chapterQuestions[chapterId]) {
      setLoadingChapters(p => ({ ...p, [chapterId]: true }));
      setChapterLoadErrors(p => ({ ...p, [chapterId]: null }));
      try {
        const q = await getStarBatchQuestions(chapterId);
        setChapterQuestions(p => ({ ...p, [chapterId]: q }));
      } catch (e) {
        console.error(e);
        setChapterLoadErrors(p => ({ ...p, [chapterId]: 'Failed to load questions. Please try again.' }));
      }
      finally { setLoadingChapters(p => ({ ...p, [chapterId]: false })); }
    }
  }

  function openAddModal(chapter, e) {
    e.stopPropagation();
    setAddingToChapter(chapter);
    setTopicName('');
    setQuestionText('');
    setImageFile(null);
    setImagePreview(null);
    setFormError('');
  }

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setFormError('Unsupported file type. Please upload a JPEG, PNG, WEBP, or GIF image.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFormError(`Image is too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)}MB). Please choose a smaller file.`);
      e.target.value = '';
      return;
    }
    setFormError('');
    setImageFile(file);
    const r = new FileReader();
    r.onloadend = () => setImagePreview(r.result);
    r.onerror = () => setFormError('Failed to read the selected image. Please try another file.');
    r.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!topicName.trim()) return setFormError('Topic name is required.');
    if (!questionText.trim() && !imageFile) return setFormError('Add a question or upload an image.');
    setIsSubmitting(true);
    setFormError('');
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

  return (
    <div style={{ animation: 'fade-in 0.4s ease' }}>
      <style>{`
        /* ── Layout ─────────────────────────────────── */
        .sb-page-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
        .sb-back-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 8px; padding: 0.5rem; cursor: pointer; display: flex; align-items: center; transition: all 0.2s; min-width: 44px; min-height: 44px; justify-content: center; }
        .sb-back-btn:hover { background: rgba(251,191,36,0.1); border-color: #fbbf24; color: #fbbf24; }
        .sb-breadcrumb { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1.5rem; font-size: 0.9rem; }
        .sb-crumb-btn { background: none; border: none; color: #fbbf24; cursor: pointer; padding: 0.3rem 0.5rem; border-radius: 4px; font-size: 0.9rem; transition: background 0.2s; min-height: 36px; }
        .sb-crumb-btn:hover { background: rgba(251,191,36,0.1); }
        .sb-crumb-current { color: rgba(255,255,255,0.6); padding: 0.3rem 0.5rem; }
        .sb-crumb-sep { color: rgba(255,255,255,0.3); }

        /* ── Section / Subject rows ──────────────────── */
        .sb-row { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 1.1rem 1.25rem; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s; width: 100%; text-align: left; color: #fff; min-height: 60px; }
        .sb-row:hover, .sb-row:active { background: rgba(251,191,36,0.05); border-color: rgba(251,191,36,0.25); }
        .sb-row-title { font-weight: 500; font-size: 1rem; color: #e2e8f0; }
        .sb-row-count { font-size: 0.78rem; color: rgba(255,255,255,0.35); margin-top: 0.2rem; }

        /* ── Chapter accordion ───────────────────────── */
        .sb-chapter-wrap { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; margin-bottom: 0.75rem; overflow: hidden; }
        .sb-chapter-header { padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background 0.2s; min-height: 56px; -webkit-tap-highlight-color: transparent; }
        .sb-chapter-header:hover, .sb-chapter-header:active { background: rgba(251,191,36,0.04); }
        .sb-chapter-title { display: flex; align-items: center; gap: 0.7rem; color: #cbd5e1; font-size: 0.95rem; font-weight: 500; }
        .sb-chapter-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
        .sb-add-btn { background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25); color: #fbbf24; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0; }
        .sb-add-btn:hover, .sb-add-btn:active { background: #fbbf24; color: #000; }

        /* ── Questions panel ─────────────────────────── */
        .sb-questions-panel { border-top: 1px solid rgba(255,255,255,0.05); padding: 0.75rem 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.6rem; }

        /* ── Topic pill (collapsed state) ────────────── */
        .sb-topic-pill {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          background: rgba(251,191,36,0.04);
          border: 1px solid rgba(251,191,36,0.15);
          border-radius: 10px;
          padding: 0.85rem 1rem;
          cursor: pointer;
          transition: all 0.22s ease;
          width: 100%;
          text-align: left;
          min-height: 52px;
          -webkit-tap-highlight-color: transparent;
        }
        .sb-topic-pill:hover, .sb-topic-pill:active {
          background: rgba(251,191,36,0.1);
          border-color: rgba(251,191,36,0.35);
          transform: translateY(-1px);
        }
        .sb-topic-pill-left { display: flex; align-items: center; gap: 0.6rem; flex: 1; min-width: 0; }
        .sb-topic-dot { width: 7px; height: 7px; border-radius: 50%; background: #fbbf24; flex-shrink: 0; box-shadow: 0 0 6px rgba(251,191,36,0.5); }
        .sb-topic-name { font-weight: 600; color: #fbbf24; font-size: 0.9rem; line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-topic-meta { font-size: 0.72rem; color: rgba(255,255,255,0.38); font-weight: 400; margin-top: 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-topic-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
        .sb-topic-badge { font-size: 0.68rem; color: rgba(255,255,255,0.35); background: rgba(255,255,255,0.06); padding: 0.2rem 0.5rem; border-radius: 20px; white-space: nowrap; }
        .sb-topic-chevron { color: rgba(251,191,36,0.6); transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1); flex-shrink: 0; }
        .sb-topic-chevron.open { transform: rotate(90deg); color: #fbbf24; }

        /* ── Expanded content area ───────────────────── */
        .sb-topic-body {
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          transition: max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease, padding 0.25s ease;
          padding: 0 1rem;
        }
        .sb-topic-body.open {
          max-height: 1200px;
          opacity: 1;
          padding: 0.75rem 1rem 1rem;
        }
        .sb-topic-text { color: #e2e8f0; font-size: 0.88rem; line-height: 1.6; white-space: pre-wrap; margin-bottom: 0.6rem; }
        .sb-topic-img { width: 100%; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); display: block; margin-top: 0.5rem; }
        .sb-topic-divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 0 -1rem; }

        /* ── Misc ────────────────────────────────────── */
        .sb-empty { color: rgba(255,255,255,0.3); font-size: 0.85rem; font-style: italic; text-align: center; padding: 0.75rem 0; }

        /* ── Add-question modal ──────────────────────── */
        .sb-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: flex-end; justify-content: center; z-index: 9999; padding: 0; }
        @media (min-width: 600px) { .sb-overlay { align-items: center; padding: 1rem; } }
        .sb-modal { background: #0e1117; border: 1px solid rgba(251,191,36,0.25); border-radius: 22px 22px 0 0; width: 100%; max-width: 490px; padding: 1.5rem 1.25rem 2rem; box-shadow: 0 -20px 60px rgba(0,0,0,0.5); max-height: 92vh; overflow-y: auto; }
        @media (min-width: 600px) { .sb-modal { border-radius: 18px; padding: 1.75rem; } }
        .sb-modal-handle { width: 36px; height: 4px; background: rgba(255,255,255,0.15); border-radius: 2px; margin: 0 auto 1.25rem; }
        @media (min-width: 600px) { .sb-modal-handle { display: none; } }
        .sb-modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
        .sb-modal-title { font-size: 1.1rem; font-weight: 600; color: #fbbf24; margin: 0; line-height: 1.3; }
        .sb-modal-sub { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
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

      {/* Page Header */}
      <div className="sb-page-header">
        {sectionId && (
          <button className="sb-back-btn" onClick={() => { if (subjectId) setSubjectId(null); else setSectionId(null); setOpenChapterId(null); }}>
            <ArrowLeft size={18} />
          </button>
        )}
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.4rem', fontWeight: 700 }}>
            <Star size={22} color="#fbbf24" /> Elite Syllabus
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>
            Browse sections and add targeted questions per chapter
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="sb-breadcrumb">
        <button className="sb-crumb-btn" onClick={() => { setSectionId(null); setSubjectId(null); setOpenChapterId(null); }}>All Sections</button>
        {activeSection && (
          <>
            <ChevronRight size={13} className="sb-crumb-sep" />
            {activeSubject
              ? <button className="sb-crumb-btn" onClick={() => { setSubjectId(null); setOpenChapterId(null); }}>{activeSection.sectionName}</button>
              : <span className="sb-crumb-current">{activeSection.sectionName}</span>
            }
          </>
        )}
        {activeSubject && (
          <>
            <ChevronRight size={13} className="sb-crumb-sep" />
            <span className="sb-crumb-current">{activeSubject.subjectName}</span>
          </>
        )}
      </div>

      {/* Level 1: Sections */}
      {!activeSection && (
        <div>
          {syllabusData.map(section => (
            <button key={section.sectionId} className="sb-row" onClick={() => { setSectionId(section.sectionId); setSubjectId(null); setOpenChapterId(null); }}>
              <div>
                <div className="sb-row-title">{section.sectionName}</div>
                <div className="sb-row-count">{section.subjects.length} subjects</div>
              </div>
              <ChevronRight size={18} color="#fbbf24" />
            </button>
          ))}
        </div>
      )}

      {/* Level 2: Subjects */}
      {activeSection && !activeSubject && (
        <div>
          {activeSection.subjects.map(subject => (
            <button key={subject.subjectId} className="sb-row" onClick={() => { setSubjectId(subject.subjectId); setOpenChapterId(null); }}>
              <div>
                <div className="sb-row-title">{subject.subjectName}</div>
                <div className="sb-row-count">{subject.chapters.length} chapters</div>
              </div>
              <ChevronRight size={18} color="#fbbf24" />
            </button>
          ))}
        </div>
      )}

      {/* Level 3: Chapters with expand + questions */}
      {activeSubject && (
        <div>
          {activeSubject.chapters.map(chapter => {
            const isOpen = openChapterId === chapter.chapterId;
            const questions = chapterQuestions[chapter.chapterId] || [];
            const isLoading = loadingChapters[chapter.chapterId];
            return (
              <div key={chapter.chapterId} className="sb-chapter-wrap">
                <div className="sb-chapter-header" onClick={() => toggleChapter(chapter.chapterId)}>
                  <div className="sb-chapter-title">
                    <ChevronRight size={16} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: '#fbbf24', flexShrink: 0 }} />
                    {chapter.chapterName}
                  </div>
                  <div className="sb-chapter-actions" onClick={e => e.stopPropagation()}>
                    {questions.length > 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginRight: '0.25rem' }}>{questions.length}Q</span>
                    )}
                    <button className="sb-add-btn" title="Add Topic / Question" onClick={(e) => openAddModal(chapter, e)}>
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="sb-questions-panel">
                    {isLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', padding: '0.25rem 0' }}>
                        <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Loading questions…
                      </div>
                    ) : chapterLoadErrors[chapter.chapterId] ? (
                      <div className="sb-error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span>{chapterLoadErrors[chapter.chapterId]}</span>
                        <button
                          type="button"
                          onClick={() => { setOpenChapterId(null); toggleChapter(chapter.chapterId); }}
                          style={{ background: 'none', border: 'none', color: '#fca5a5', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0 }}
                        >
                          Retry
                        </button>
                      </div>
                    ) : questions.length > 0 ? (
                      questions.map((q, idx) => {
                        const isExpanded = expandedQuestionId === q.id;
                        const hasContent = q.questionText || q.imageUrl;
                        return (
                          <div key={q.id}>
                            {/* Collapsed topic pill */}
                            <button
                              className="sb-topic-pill"
                              onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                              aria-expanded={isExpanded}
                            >
                              <div className="sb-topic-pill-left">
                                <div className="sb-topic-dot" />
                                <div style={{ minWidth: 0 }}>
                                  <div className="sb-topic-name">{q.topicName}</div>
                                  <div className="sb-topic-meta">by {q.authorName}</div>
                                </div>
                              </div>
                              <div className="sb-topic-right">
                                {q.imageUrl && (
                                  <span className="sb-topic-badge">📷 img</span>
                                )}
                                {hasContent && (
                                  <ChevronRight
                                    size={16}
                                    className={`sb-topic-chevron${isExpanded ? ' open' : ''}`}
                                  />
                                )}
                              </div>
                            </button>

                            {/* Expanded content — smooth CSS height animation */}
                            <div className={`sb-topic-body${isExpanded ? ' open' : ''}`}>
                              {idx > 0 && <hr className="sb-topic-divider" />}
                              {q.questionText && (
                                <p className="sb-topic-text">{q.questionText}</p>
                              )}
                              {q.imageUrl && (
                                <img
                                  src={q.imageUrl}
                                  alt={q.topicName}
                                  className="sb-topic-img"
                                  loading="lazy"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="sb-empty">No topics added yet. Use the + button to add one.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Question Modal */}
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
                placeholder="Type the question or notes here... (optional if uploading image)"
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
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', color: '#fff', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={13} />
                  </button>
                </div>
              )}

              {formError && <div className="sb-error">{formError}</div>}

              <button type="submit" className="sb-submit-btn" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Send size={17} /> Add Topic</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
