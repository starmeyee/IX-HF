import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { syllabusData } from '../data/syllabusData';
import { Plus, Image as ImageIcon, Send, Loader2, X, Star, Download, ChevronDown, Sparkles, Bookmark, Flag, Search, Filter, FileJson } from 'lucide-react';
import { 
  addStarBatchQuestion, 
  getAllStarBatchQuestions, 
  uploadImageToCloudinary,
  bookmarkQuestion,
  reportQuestion,
  bulkUploadStarBatchQuestions
} from '../services/starBatchSyllabusService';
import { useAuth } from '../auth/AuthContext';
import { getUserRole, ROLES } from '../auth/roles';

// ── Text Similarity Helper (Dice Coefficient) ──
function getBigrams(str) {
  const bigrams = new Set();
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.add(str.substring(i, i + 2));
  }
  return bigrams;
}
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1 : 0;
  
  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);
  let intersection = 0;
  for (const bg of bg1) {
    if (bg2.has(bg)) intersection++;
  }
  return (2.0 * intersection) / (bg1.size + bg2.size);
}

const MARKS_OPTIONS = ['1', '2', '3', '4', '5', '6', '10', 'Unknown'];
const SOURCE_OPTIONS = ['School Test', 'Coaching', 'NCERT', 'Previous Year', 'Other', 'Unknown'];

// ── Quick-upload modal ──
function QuickUploadModal({ onClose, currentUser, onSuccess, existingQuestions }) {
  const [selSectionId, setSelSectionId] = useState('');
  const [selSubjectId, setSelSubjectId] = useState('');
  const [selChapterId, setSelChapterId] = useState('');

  const [topicName,    setTopicName]    = useState('');
  const [questionText, setQuestionText] = useState('');
  const [marks,        setMarks]        = useState('');
  const [source,       setSource]       = useState('');
  
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading,  setIsAiLoading]  = useState(false);
  const [formError,    setFormError]    = useState('');
  const [success,      setSuccess]      = useState(false);
  const [showDupWarn,  setShowDupWarn]  = useState(false);

  const fileRef = useRef(null);

  const activeSection = syllabusData.find(s => s.sectionId === selSectionId) || null;
  const activeSubject = activeSection?.subjects.find(s => s.subjectId === selSubjectId) || null;
  const activeChapter = activeSubject?.chapters.find(c => c.chapterId === selChapterId) || null;

  function pickSection(id) { setSelSectionId(id); setSelSubjectId(''); setSelChapterId(''); setFormError(''); }
  function pickSubject(id) { setSelSubjectId(id); setSelChapterId(''); setFormError(''); }
  function pickChapter(id) { setSelChapterId(id); setFormError(''); }

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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

  async function handleAutoTag() {
    if (!questionText.trim()) return setFormError('Enter question text first to use AI auto-tag.');
    setIsAiLoading(true); setFormError('');
    try {
      const res = await fetch('/api/ai-suggest-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: questionText })
      });
      if (!res.ok) throw new Error('AI suggestion failed.');
      const data = await res.json();
      
      if (data.subject && data.subject !== 'Unknown') {
        // Try to auto-select subject
        const foundSub = syllabusData.flatMap(s => s.subjects).find(sub => sub.subjectName.toLowerCase() === data.subject.toLowerCase());
        if (foundSub) {
          const foundSec = syllabusData.find(sec => sec.subjects.some(s => s.subjectId === foundSub.subjectId));
          setSelSectionId(foundSec.sectionId);
          setSelSubjectId(foundSub.subjectId);
          // Try chapter
          if (data.chapter && data.chapter !== 'Unknown') {
            const foundChap = foundSub.chapters.find(c => c.chapterName.toLowerCase().includes(data.chapter.toLowerCase()));
            if (foundChap) setSelChapterId(foundChap.chapterId);
          }
        }
      }
      if (data.topic && data.topic !== 'Unknown') setTopicName(data.topic);
      if (data.marks && MARKS_OPTIONS.includes(data.marks)) setMarks(data.marks);
      
    } catch (e) {
      setFormError('Failed to auto-tag. Please fill manually.');
    } finally {
      setIsAiLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (showDupWarn) {
      // User is forcing submit after warning
      await saveQuestion();
      return;
    }

    if (!selChapterId)         return setFormError('Please select a chapter first.');
    if (!questionText.trim() && !imageFile) return setFormError('Add question text or upload an image (or both).');
    if (!marks) return setFormError('Please select Marks.');
    if (!source) return setFormError('Please select Source.');

    // Duplicate Check
    if (questionText.trim()) {
      const chapterQs = existingQuestions.filter(q => q.chapterId === selChapterId);
      for (const q of chapterQs) {
        if (calculateSimilarity(questionText, q.questionText) > 0.7) {
          setShowDupWarn(true);
          return; // Stop here, show warning
        }
      }
    }
    
    await saveQuestion();
  }

  async function saveQuestion() {
    setIsSubmitting(true); setFormError('');
    try {
      let imageUrl = null;
      if (imageFile) imageUrl = await uploadImageToCloudinary(imageFile);
      await addStarBatchQuestion(
        selChapterId, 
        selSubjectId, 
        topicName, 
        questionText, 
        imageUrl, 
        marks, 
        source, 
        currentUser
      );
      setSuccess(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1200);
    } catch (err) {
      setFormError(err.message || 'Upload failed. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        .qu-overlay { position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.82); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); display: flex; align-items: flex-end; justify-content: center; animation: quOverlayIn 0.2s ease; }
        @keyframes quOverlayIn { from { opacity:0 } to { opacity:1 } }
        @media (min-width: 640px) { .qu-overlay { align-items: center; padding: 1.5rem; } }
        .qu-modal { background: #0c0e16; border: 1px solid rgba(251,191,36,0.18); border-radius: 26px 26px 0 0; width: 100%; max-width: 520px; max-height: 94vh; overflow-y: auto; box-shadow: 0 -32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset; animation: quSheetUp 0.3s cubic-bezier(0.32,0.72,0,1); padding-bottom: env(safe-area-inset-bottom, 1.5rem); }
        @keyframes quSheetUp { from { transform:translateY(100%); opacity:0.4 } to { transform:translateY(0); opacity:1 } }
        @media (min-width: 640px) { .qu-modal { border-radius: 22px; animation: quPopIn 0.25s cubic-bezier(0.34,1.56,0.64,1); } @keyframes quPopIn { from { transform:scale(0.88); opacity:0 } to { transform:scale(1); opacity:1 } } }
        .qu-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.12); margin: 0.85rem auto 0; }
        @media (min-width: 640px) { .qu-handle { display:none } }
        .qu-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1.25rem 1.5rem 0; }
        .qu-header-icon { width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0; background: linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(245,158,11,0.08) 100%); border: 1px solid rgba(251,191,36,0.25); display: flex; align-items: center; justify-content: center; }
        .qu-header-text { flex: 1; min-width: 0; }
        .qu-header-title { font-size: 1.15rem; font-weight: 700; color: #f1f5f9; margin: 0 0 0.2rem; }
        .qu-header-sub { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0; }
        .qu-close-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); border-radius: 10px; width: 36px; height: 36px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; margin-top: 0.2rem; }
        .qu-close-btn:hover { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.35); color: #f87171; }
        .qu-section-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.3); margin: 0 0 0.6rem; display: flex; align-items: center; gap: 0.4rem; }
        .qu-section-label::before { content:''; flex:1; height:1px; background: rgba(255,255,255,0.07); }
        .qu-loc-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.5rem; }
        @media (max-width: 480px) { .qu-loc-grid { grid-template-columns: 1fr; } }
        .qu-select-wrap { position: relative; }
        .qu-select { width: 100%; appearance: none; -webkit-appearance: none; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; padding: 0.7rem 2.4rem 0.7rem 0.9rem; color: #e2e8f0; font-size: 0.88rem; outline: none; cursor: pointer; transition: border-color 0.2s, background 0.2s; min-height: 44px; box-sizing: border-box; }
        .qu-select:focus, .qu-select:hover { border-color: rgba(251,191,36,0.4); background: rgba(251,191,36,0.04); }
        .qu-select:disabled { opacity: 0.35; cursor: default; }
        .qu-select option { background: #1a1d2e; color: #e2e8f0; }
        .qu-select-icon { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.35); pointer-events: none; }
        .qu-select.filled { border-color: rgba(251,191,36,0.35); color: #fbbf24; }
        .qu-input, .qu-textarea { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.09); border-radius: 10px; padding: 0.85rem 1rem; color: #f1f5f9; font-size: 0.95rem; outline: none; box-sizing: border-box; transition: border-color 0.2s; font-family: inherit; }
        .qu-input:focus, .qu-textarea:focus { border-color: rgba(251,191,36,0.45); box-shadow: 0 0 0 3px rgba(251,191,36,0.07); }
        .qu-input::placeholder, .qu-textarea::placeholder { color: rgba(255,255,255,0.25); }
        .qu-textarea { min-height: 100px; resize: vertical; line-height: 1.55; }
        .qu-drop-zone { border: 1.5px dashed rgba(255,255,255,0.12); border-radius: 12px; padding: 1.1rem 1rem; cursor: pointer; text-align: center; transition: all 0.22s; background: rgba(255,255,255,0.02); display: flex; align-items: center; justify-content: center; gap: 0.7rem; color: rgba(255,255,255,0.4); font-size: 0.88rem; min-height: 56px; }
        .qu-drop-zone:hover { border-color: #fbbf24; color: #fbbf24; background: rgba(251,191,36,0.04); }
        .qu-drop-zone.has-file { border-color: rgba(251,191,36,0.4); color: #fbbf24; background: rgba(251,191,36,0.06); }
        .qu-preview-wrap { position: relative; border-radius: 12px; overflow: hidden; }
        .qu-preview-img { width: 100%; display: block; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); max-height: 240px; object-fit: contain; background: rgba(0,0,0,0.3); }
        .qu-preview-remove { position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.75); border: none; border-radius: 50%; color: #fff; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(4px); transition: background 0.2s; }
        .qu-preview-remove:hover { background: rgba(239,68,68,0.8); }
        .qu-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #fca5a5; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.85rem; display: flex; align-items: flex-start; gap: 0.5rem; }
        .qu-warn { background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25); color: #fbbf24; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .qu-submit { width: 100%; border: none; border-radius: 13px; min-height: 54px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #0a0a0a; font-size: 1rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; transition: all 0.2s; letter-spacing: 0.01em; box-shadow: 0 4px 20px rgba(251,191,36,0.2); }
        .qu-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(245,158,11,0.4); }
        .qu-submit:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .qu-submit.success { background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 20px rgba(16,185,129,0.3); }
        .qu-btn-secondary { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 8px; padding: 0.5rem 1rem; font-size: 0.85rem; cursor: pointer; }
        .qu-btn-secondary:hover { background: rgba(255,255,255,0.12); }
      `}</style>

      <div className="qu-overlay" onClick={() => !isSubmitting && !success && onClose()}>
        <div className="qu-modal" onClick={e => e.stopPropagation()}>
          <div className="qu-handle" />
          <div className="qu-header">
            <div className="qu-header-icon"><Sparkles size={20} color="#fbbf24" /></div>
            <div className="qu-header-text">
              <h2 className="qu-header-title">Add Question</h2>
              <p className="qu-header-sub">Help build the ultimate question bank</p>
            </div>
            <button className="qu-close-btn" onClick={onClose} disabled={isSubmitting} aria-label="Close"><X size={16} /></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Location */}
              <div>
                <p className="qu-section-label"><span>1</span> Where does this go?</p>
                <div className="qu-loc-grid">
                  <div className="qu-select-wrap">
                    <select className={`qu-select${selSectionId ? ' filled' : ''}`} value={selSectionId} onChange={e => pickSection(e.target.value)}>
                      <option value="">Section</option>
                      {syllabusData.map(s => <option key={s.sectionId} value={s.sectionId}>{s.sectionName}</option>)}
                    </select>
                    <ChevronDown size={14} className="qu-select-icon" />
                  </div>
                  <div className="qu-select-wrap">
                    <select className={`qu-select${selSubjectId ? ' filled' : ''}`} value={selSubjectId} onChange={e => pickSubject(e.target.value)} disabled={!activeSection}>
                      <option value="">Subject</option>
                      {activeSection?.subjects.map(s => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
                    </select>
                    <ChevronDown size={14} className="qu-select-icon" />
                  </div>
                  <div className="qu-select-wrap">
                    <select className={`qu-select${selChapterId ? ' filled' : ''}`} value={selChapterId} onChange={e => pickChapter(e.target.value)} disabled={!activeSubject}>
                      <option value="">Chapter</option>
                      {activeSubject?.chapters.map(c => <option key={c.chapterId} value={c.chapterId}>{c.chapterName}</option>)}
                    </select>
                    <ChevronDown size={14} className="qu-select-icon" />
                  </div>
                </div>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <p className="qu-section-label"><span>2</span> Question Details</p>
                
                <textarea
                  className="qu-textarea"
                  placeholder="Type or paste the question text..."
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  maxLength={4000}
                />
                
                {/* AI Auto-Tag */}
                <button type="button" onClick={handleAutoTag} disabled={isAiLoading || !questionText.trim()} style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', padding: '0.6rem', borderRadius: '8px', fontSize: '0.85rem', cursor: questionText.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', opacity: questionText.trim() ? 1 : 0.5 }}>
                  {isAiLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
                  Auto-Tag with AI
                </button>

                {imagePreview ? (
                  <div className="qu-preview-wrap">
                    <img src={imagePreview} alt="Preview" className="qu-preview-img" />
                    <button type="button" className="qu-preview-remove" onClick={clearImage} aria-label="Remove image"><X size={14} /></button>
                  </div>
                ) : (
                  <label className={`qu-drop-zone${imageFile ? ' has-file' : ''}`}>
                    <ImageIcon size={18} />
                    <span>{imageFile ? imageFile.name : 'Upload Question Image (optional)'}</span>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                  </label>
                )}

                <div className="qu-loc-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="qu-select-wrap">
                    <select className={`qu-select${marks ? ' filled' : ''}`} value={marks} onChange={e => setMarks(e.target.value)}>
                      <option value="">Marks</option>
                      {MARKS_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown size={14} className="qu-select-icon" />
                  </div>
                  <div className="qu-select-wrap">
                    <select className={`qu-select${source ? ' filled' : ''}`} value={source} onChange={e => setSource(e.target.value)}>
                      <option value="">Source</option>
                      {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={14} className="qu-select-icon" />
                  </div>
                </div>

                <input
                  type="text"
                  className="qu-input"
                  placeholder="Topic Name (optional) e.g. Important Numericals"
                  value={topicName}
                  onChange={e => setTopicName(e.target.value)}
                  maxLength={120}
                />
              </div>

              {formError && <div className="qu-error">⚠ {formError}</div>}
              {showDupWarn && (
                <div className="qu-warn">
                  <div style={{ fontWeight: 600 }}>⚠ Similar Question Found</div>
                  <p style={{ margin: 0 }}>A very similar question already exists in this chapter. Do you still want to upload this?</p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button type="button" className="qu-btn-secondary" onClick={() => setShowDupWarn(false)}>Cancel</button>
                    <button type="submit" className="qu-submit" style={{ minHeight: 'auto', padding: '0.5rem', width: 'auto', flex: 1 }}>Yes, Upload Anyway</button>
                  </div>
                </div>
              )}

              {!showDupWarn && (
                <button type="submit" className={`qu-submit${success ? ' success' : ''}`} disabled={isSubmitting || success}>
                  {success ? <><span style={{ animation: 'checkIn 0.3s ease' }}>✓ Question Added!</span></> : isSubmitting ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</> : <><Send size={17} /> Save Question</>}
                </button>
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

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  // Filters
  const [filterSection, setFilterSection] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterChapter, setFilterChapter] = useState('');
  const [searchQuery,   setSearchQuery]   = useState('');

  const [showQuickUpload, setShowQuickUpload] = useState(false);

  // Load all questions initially
  useEffect(() => {
    if (!currentUser) navigate('/');
    else if (!currentUser.isStarBatch || !currentUser.hasUnlockedStarBatch) navigate('/star-batch');
    else fetchQuestions();
  }, [currentUser, navigate]);

  async function fetchQuestions() {
    setLoading(true); setError('');
    try {
      const data = await getAllStarBatchQuestions();
      setQuestions(data);
    } catch (err) {
      setError('Failed to load question bank.');
    } finally {
      setLoading(false);
    }
  }

  // Derived state for filters
  const activeSection = syllabusData.find(s => s.sectionId === filterSection) || null;

  const isAdmin = getUserRole(currentUser?.rollNo) === ROLES.ADMIN;
  const fileInputRef = useRef(null);
  const [isUploadingJSON, setIsUploadingJSON] = useState(false);

  async function handleBulkUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("Are you sure you want to bulk upload these questions?")) {
      e.target.value = '';
      return;
    }

    setIsUploadingJSON(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await bulkUploadStarBatchQuestions(json, currentUser);
      alert('Bulk upload successful! Questions added.');
      fetchQuestions(); // refresh
    } catch (err) {
      alert('Bulk upload failed: ' + err.message);
    } finally {
      setIsUploadingJSON(false);
      e.target.value = '';
    }
  }

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (filterSubject && q.subjectId !== filterSubject) return false;
      if (filterChapter && q.chapterId !== filterChapter) return false;
      if (searchQuery) {
        const sq = searchQuery.toLowerCase();
        const textMatch = q.questionText?.toLowerCase().includes(sq) || q.topicName?.toLowerCase().includes(sq);
        if (!textMatch) return false;
      }
      return true;
    });
  }, [questions, filterSubject, filterChapter, searchQuery]);

  const isFiltering = filterSection || filterSubject || filterChapter || searchQuery;
  const displayedQuestions = isFiltering ? filteredQuestions : filteredQuestions.slice(0, 10);

  async function handleBookmark(id, isBookmarked) {
    // optimistic UI update
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        const newBookmarks = isBookmarked 
          ? (q.bookmarkedBy || []).filter(u => u !== currentUser.id)
          : [...(q.bookmarkedBy || []), currentUser.id];
        return { ...q, bookmarkedBy: newBookmarks };
      }
      return q;
    }));
    try {
      await bookmarkQuestion(id, currentUser.id, isBookmarked);
    } catch (e) {
      console.error(e);
      // revert if failed (simple version doesn't strictly revert here but logs)
    }
  }

  async function handleReport(id) {
    if (!window.confirm("Are you sure you want to report this question as incorrect/inappropriate?")) return;
    setQuestions(prev => prev.map(q => {
      if (q.id === id) {
        return { ...q, reports: [...(q.reports || []), currentUser.id] };
      }
      return q;
    }));
    try {
      await reportQuestion(id, currentUser.id);
      alert('Question reported successfully. Admins will review it.');
    } catch(e) {
      console.error(e);
    }
  }

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

  if (!currentUser || !currentUser.isStarBatch || !currentUser.hasUnlockedStarBatch) return null;

  return (
    <div style={{ animation: 'fade-in 0.4s ease', paddingBottom: '6rem' }}>
      <style>{`
        .qb-header { margin-bottom: 1.5rem; }
        .qb-title { display: flex; align-items: center; gap: 0.6rem; margin: 0; font-size: 1.35rem; font-weight: 700; color: #fff; }
        .qb-subtitle { color: rgba(255,255,255,0.5); font-size: 0.85rem; margin: 0.2rem 0 0; }
        
        /* ── Filters ── */
        .qb-filters { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 1rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .qb-filter-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
        .qb-filter-select { flex: 1; min-width: 120px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0.6rem 0.8rem; color: #e2e8f0; font-size: 0.85rem; outline: none; appearance: none; -webkit-appearance: none; cursor: pointer; }
        .qb-filter-select option { background: #1a1d2e; }
        .qb-search { flex: 2; min-width: 200px; display: flex; align-items: center; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0 0.8rem; }
        .qb-search input { width: 100%; background: none; border: none; color: #fff; padding: 0.6rem 0.5rem; outline: none; font-size: 0.85rem; }
        
        /* ── Card ── */
        .qb-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.25rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.75rem; transition: border-color 0.2s; }
        .qb-card:hover { border-color: rgba(255,255,255,0.15); }
        .qb-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
        .qb-card-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .qb-tag { background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25); color: #fbbf24; border-radius: 6px; padding: 0.2rem 0.5rem; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
        .qb-tag.source { background: rgba(56,189,248,0.1); border-color: rgba(56,189,248,0.25); color: #38bdf8; }
        .qb-card-meta { font-size: 0.75rem; color: rgba(255,255,255,0.4); text-align: right; }
        .qb-card-text { font-size: 0.95rem; color: #f1f5f9; line-height: 1.6; white-space: pre-wrap; margin: 0; }
        .qb-card-img { width: 100%; max-height: 300px; object-fit: contain; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.4); cursor: pointer; }
        .qb-card-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 0.75rem; margin-top: 0.5rem; }
        .qb-action-btn { display: flex; align-items: center; gap: 0.4rem; background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 0.8rem; font-weight: 500; transition: color 0.2s; padding: 0.3rem; border-radius: 6px; }
        .qb-action-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .qb-action-btn.active { color: #fbbf24; }
        .qb-action-btn.danger:hover { color: #f87171; background: rgba(248,113,113,0.1); }
        
        .sb-fab { position: fixed; bottom: 5.5rem; right: 1.25rem; z-index: 1000; width: 58px; height: 58px; border-radius: 18px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border: none; color: #000; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; box-shadow: 0 8px 30px rgba(245,158,11,0.45), 0 2px 8px rgba(0,0,0,0.3); transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1); -webkit-tap-highlight-color: transparent; }
        .sb-fab:hover { transform: scale(1.08) translateY(-2px); box-shadow: 0 14px 40px rgba(245,158,11,0.55); }
        .sb-fab:active { transform: scale(0.96); }
        .sb-fab-label { font-size: 0.52rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; line-height: 1; }
        
        @keyframes fade-in { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform:none; } }
      `}</style>

      <div className="qb-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="qb-title"><Star size={20} color="#fbbf24" /> Reliable Question Bank</h2>
          <p className="qb-subtitle">Filter to find top quality exam questions, or add your own.</p>
        </div>
        {isAdmin && (
          <div>
            <input type="file" accept=".json" style={{ display: 'none' }} ref={fileInputRef} onChange={handleBulkUpload} />
            <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingJSON} style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', padding: '0.5rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
              {isUploadingJSON ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FileJson size={14} />}
              Bulk Upload
            </button>
          </div>
        )}
      </div>

      <div className="qb-filters">
        <div className="qb-filter-row">
          <select className="qb-filter-select" value={filterSection} onChange={e => { setFilterSection(e.target.value); setFilterSubject(''); setFilterChapter(''); }}>
            <option value="">All Sections</option>
            {syllabusData.map(s => <option key={s.sectionId} value={s.sectionId}>{s.sectionName}</option>)}
          </select>
          <select className="qb-filter-select" value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setFilterChapter(''); }} disabled={!activeSection}>
            <option value="">All Subjects</option>
            {activeSection?.subjects.map(s => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
          </select>
          <select className="qb-filter-select" value={filterChapter} onChange={e => setFilterChapter(e.target.value)} disabled={!filterSubject}>
            <option value="">All Chapters</option>
            {activeSection?.subjects.find(s => s.subjectId === filterSubject)?.chapters.map(c => <option key={c.chapterId} value={c.chapterId}>{c.chapterName}</option>)}
          </select>
        </div>
        <div className="qb-filter-row">
          <div className="qb-search">
            <Search size={16} color="rgba(255,255,255,0.4)" />
            <input type="text" placeholder="Search keywords or topics..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,255,255,0.4)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          Loading Question Bank...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', color: '#fca5a5' }}>{error}</div>
      ) : filteredQuestions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,255,255,0.4)' }}>
          <Filter size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p>No questions found for these filters.</p>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
            {isFiltering 
              ? `Found ${filteredQuestions.length} question(s)` 
              : `Showing recent ${displayedQuestions.length} questions (of ${questions.length} total)`}
          </div>
          {displayedQuestions.map(q => {
            const isBookmarked = (q.bookmarkedBy || []).includes(currentUser.id);
            const isReported = (q.reports || []).includes(currentUser.id);
            // Reconstruct path names for display if possible
            const qSec = syllabusData.find(sec => sec.subjects.some(s => s.subjectId === q.subjectId));
            const qSub = qSec?.subjects.find(s => s.subjectId === q.subjectId);
            const qChap = qSub?.chapters.find(c => c.chapterId === q.chapterId);

            return (
              <div key={q.id} className="qb-card">
                <div className="qb-card-header">
                  <div className="qb-card-tags">
                    {q.marks && q.marks !== 'Unknown' && <span className="qb-tag">{q.marks} Marks</span>}
                    {q.source && q.source !== 'Unknown' && <span className="qb-tag source">{q.source}</span>}
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', padding: '0.1rem 0', marginLeft: '0.2rem' }}>
                      {qSub?.subjectName || 'Unknown'} › {qChap?.chapterName || 'Unknown'}
                    </span>
                  </div>
                  <div className="qb-card-meta">
                    <div>{q.authorName}</div>
                    <div style={{ fontSize: '0.65rem' }}>
                      {q.createdAt ? new Date(q.createdAt.toMillis()).toLocaleDateString() : 'Just now'}
                    </div>
                  </div>
                </div>

                {q.topicName && q.topicName !== 'Untitled Topic' && (
                  <div style={{ fontWeight: 600, color: '#fbbf24', fontSize: '0.9rem' }}>{q.topicName}</div>
                )}
                
                {q.questionText && <p className="qb-card-text">{q.questionText}</p>}
                
                {q.imageUrl && (
                  <div style={{ position: 'relative' }}>
                    <img src={q.imageUrl} alt="Question" className="qb-card-img" onClick={() => downloadImage(q.imageUrl, q.topicName || 'question')} title="Click to download" />
                    <button onClick={() => downloadImage(q.imageUrl, q.topicName || 'question')} style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', padding: '0.4rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', display: 'flex', gap: '0.3rem', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
                      <Download size={12} /> Download
                    </button>
                  </div>
                )}

                <div className="qb-card-footer">
                  <button className={`qb-action-btn ${isBookmarked ? 'active' : ''}`} onClick={() => handleBookmark(q.id, isBookmarked)}>
                    <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
                    {q.bookmarkedBy?.length > 0 && <span style={{ marginLeft: '0.2rem' }}>{q.bookmarkedBy.length}</span>}
                  </button>
                  
                  <button className="qb-action-btn danger" onClick={() => handleReport(q.id)} disabled={isReported} title="Report inappropriate or incorrect">
                    <Flag size={14} /> {isReported ? 'Reported' : 'Report'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Quick Upload FAB ── */}
      <button className="sb-fab" onClick={() => setShowQuickUpload(true)} aria-label="Upload question">
        <Plus size={24} strokeWidth={2.5} />
        <span className="sb-fab-label">Upload</span>
      </button>

      {showQuickUpload && (
        <QuickUploadModal
          onClose={() => setShowQuickUpload(false)}
          currentUser={currentUser}
          onSuccess={fetchQuestions}
          existingQuestions={questions}
        />
      )}
    </div>
  );
}
