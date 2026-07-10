import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Upload, FileText, Clock, CheckCircle, XCircle, Zap, HelpCircle, Share2, Download, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roles';
import { syllabusData } from '../data/syllabusData';
import { holidayData } from '../data/holidayData';
import { getNotesByChapter, getMyNotes, getPublishedNotes, getNoteById, getNotesBySection } from '../services/notesService';
import {
  getSparks, getSparkLog, spendSparks,
  getPurchasedChapters, purchaseChapter,
  SPARK_VIEW_COST, INITIAL_SPARKS,
} from '../services/sparksService';
import { logActivity } from '../services/adminService';
import NotesViewer from '../components/NotesViewer';
import UploadNoteModal from '../components/UploadNoteModal';
import TourRunner from '../ux/components/TourRunner';
import { NOTES_TOUR_STEPS } from '../ux/campaignConfig';
import { markCampaignSeen, snoozeNotesTour } from '../ux/campaignService';

/* ── Notes Tour Prompt Modal ─────────────────────────────────── */
function TourPromptModal({ onStart, onSkip }) {
  return (
    <div className="complaint-overlay">
      <div className="complaint-modal" style={{ maxWidth: 400 }}>
        <div className="complaint-glow" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, transparent 70%)' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          {/* Icon */}
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: 'var(--primary)' }}>
            <HelpCircle size={26} />
          </div>

          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
            Quick Notes Tour?
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
            First time here? Let us show you how to browse, unlock, and submit notes — takes about 30 seconds.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <button
              className="complaint-submit-btn"
              onClick={onStart}
              style={{ width: '100%' }}
            >
              <Zap size={16} /> Let's go!
            </button>
            <button
              onClick={onSkip}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', padding: '0.7rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.88rem', transition: 'border-color 0.2s, color 0.2s', width: '100%' }}
              onMouseEnter={e => { e.target.style.borderColor = 'var(--text-muted)'; e.target.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-muted)'; }}
            >
              Skip — don't show for 7 days
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SparkIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <path d="M8 1L3 8h4l-1 5 6-7H8l1-5z" fill={color} stroke={color} strokeWidth="0.5" strokeLinejoin="round" />
    </svg>
  );
}

function SparkWallet({ sparks }) {
  return (
    <div className="spark-wallet" data-tour="spark-wallet">
      <SparkIcon size={15} color="#f59e0b" />
      <span className="spark-wallet-count">{sparks}</span>
      <span className="spark-wallet-label">Sparks</span>
    </div>
  );
}

function SectionCard({ section, onClick }) {
  return (
    <button className="notes-section-card" onClick={onClick}>
      <span className="notes-section-name">{section.sectionName}</span>
      <span className="notes-section-meta">{section.subjects.length} subjects · {section.subjects.reduce((a, s) => a + s.chapters.length, 0)} chapters</span>
      <ChevronRight size={16} className="notes-section-arrow" />
    </button>
  );
}

function shareNote(note) {
  const url = `${window.location.origin}/api/note-share?id=${note.id}`;
  if (navigator.share) {
    navigator.share({ title: note.title, text: `${note.subjectName} · ${note.chapterName}`, url });
  } else {
    navigator.clipboard.writeText(url).then(() => alert('Link copied!'));
  }
}

// ── Note action modal (view / download gate) ──────────────────
function NoteActionModal({ note, free, sparks, onClose, onView, onDownload, onPurchaseAndAction }) {
  const [busy, setBusy] = useState(false);

  async function handleAction(action) {
    if (free) {
      action === 'view' ? onView() : onDownload();
      onClose();
      return;
    }
    if (sparks < SPARK_VIEW_COST) {
      alert(`You need ${SPARK_VIEW_COST} ✦ Sparks. Upload notes to earn more!`);
      return;
    }
    setBusy(true);
    try {
      await onPurchaseAndAction(action);
    } finally {
      setBusy(false);
      onClose();
    }
  }

  return (
    <div className="notes-viewer-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '1.5rem', width: '90%', maxWidth: '380px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{note.title}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{note.subjectName} · {note.chapterName}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.1rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Uploader + date */}
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          by {note.uploaderName} · {new Date(note.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </p>

        {/* Cost badge */}
        {!free && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 'var(--radius-sm)', padding: '0.5rem', marginBottom: '1rem',
          }}>
            <SparkIcon size={14} color="#f59e0b" />
            <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>
              Costs {SPARK_VIEW_COST} Sparks to unlock · You have {sparks}
            </span>
          </div>
        )}
        {free && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
            borderRadius: 'var(--radius-sm)', padding: '0.5rem', marginBottom: '1rem',
          }}>
            <CheckCircle size={14} color="#10b981" />
            <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>Chapter unlocked — free access</span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            className="auth-btn primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            disabled={busy}
            onClick={() => handleAction('view')}
          >
            <FileText size={15} /> {free ? 'View' : `View  -${SPARK_VIEW_COST}✦`}
          </button>
          <button
            className="auth-btn secondary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
            disabled={busy}
            onClick={() => handleAction('download')}
          >
            <Download size={15} /> {free ? 'Download' : `Download  -${SPARK_VIEW_COST}✦`}
          </button>
        </div>
        {!free && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.6rem' }}>
            Unlocking gives permanent free access to the whole chapter.
          </p>
        )}
      </div>
    </div>
  );
}

function NotesListItem({ note, onView, onDownload, free, sparks }) {
  const [showModal, setShowModal] = useState(false);
  return (
    <div className="notes-list-item">
      <div className="notes-list-info">
        <span className="notes-list-title">{note.title}</span>
        {note.description && <span className="notes-list-desc">{note.description}</span>}
        <span className="notes-list-meta">by {note.uploaderName} · {new Date(note.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
      </div>
      <div className="notes-list-actions">
        <button className="notes-view-btn" onClick={() => setShowModal(true)}>
          <FileText size={14} /> View{!free && <span className="notes-cost"> -{SPARK_VIEW_COST}✦</span>}
          {free && <span className="notes-cost" style={{ color: '#10b981' }}> Free</span>}
        </button>
        <button
          className="notes-view-btn"
          onClick={() => shareNote(note)}
          title="Share"
          style={{ background: 'var(--surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          <Share2 size={13} />
        </button>
        <button
          className="notes-view-btn"
          onClick={() => setShowModal(true)}
          style={{ background: 'var(--surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
          title="Download"
        >
          <Download size={13} />
        </button>
      </div>
      {showModal && (
        <NoteActionModal
          note={note}
          free={free}
          sparks={sparks}
          onClose={() => setShowModal(false)}
          onView={() => onView(note)}
          onDownload={() => onDownload(note)}
          onPurchaseAndAction={(action) => action === 'view' ? onView(note) : onDownload(note)}
        />
      )}
    </div>
  );
}

function SparkLogItem({ entry }) {
  const isEarn = entry.type === 'earn';
  return (
    <div className="spark-log-item">
      <span className={`spark-log-delta ${isEarn ? 'earn' : 'spend'}`}>
        {isEarn ? '+' : '-'}{entry.amount} <SparkIcon size={11} color={isEarn ? '#10b981' : '#ef4444'} />
      </span>
      <span className="spark-log-reason">{entry.reason}</span>
      <span className="spark-log-balance">✦ {entry.balance}</span>
    </div>
  );
}

// ── Holiday Homework answers view ────────────────────────────
function HHNotesView({ task, onUpload, currentUser, sparks, setSparks, purchasedChapters, setPurchasedChapters }) {
  const [notes,   setNotes]   = useState(null);
  const [viewing, setViewing] = useState(null);
  const [busy,    setBusy]    = useState(null);

  const free = purchasedChapters?.has(task.chapterId);

  useEffect(() => {
    getNotesByChapter(task.chapterId)
      .then(setNotes)
      .catch(() => setNotes([]));
  }, [task.chapterId]);

  async function handleOpen(note, action) {
    if (!currentUser) return;
    if (free) {
      if (action === 'view') {
        setViewing(note);
      } else {
        // Forced download — fetch blob so Chrome saves to downloads
        try {
          const res = await fetch(note.blobUrl, { mode: 'cors' });
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objUrl;
          a.download = `${(note.title || 'notes').replace(/[/\\:*?"<>|]/g, '_')}.pdf`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
        } catch { window.open(note.blobUrl, '_blank', 'noopener,noreferrer'); }
      }
      return;
    }
    if (sparks < SPARK_VIEW_COST) {
      alert(`You need ${SPARK_VIEW_COST} ✦ Sparks to unlock this answer. Upload notes to earn more!`);
      return;
    }
    setBusy(note.id);
    try {
      const newBal = await spendSparks(currentUser.phone, SPARK_VIEW_COST, `Unlocked HH answer: ${note.title}`);
      await purchaseChapter(currentUser.phone, task.chapterId);
      setSparks(newBal);
      setPurchasedChapters(prev => new Set([...prev, task.chapterId]));
      if (action === 'view') {
        setViewing(note);
      } else {
        try {
          const res = await fetch(note.blobUrl, { mode: 'cors' });
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objUrl;
          a.download = `${(note.title || 'notes').replace(/[/\\:*?"<>|]/g, '_')}.pdf`;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
        } catch { window.open(note.blobUrl, '_blank', 'noopener,noreferrer'); }
      }
    } catch (e) {
      alert('Failed: ' + e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className="notes-chapter-title" style={{ margin: 0 }}>{task.chapterName} — Answers</h3>
        <button
          className="auth-btn primary"
          onClick={onUpload}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
        >
          <Upload size={14} /> Upload Answer
        </button>
      </div>

      {notes === null ? (
        <p className="notes-muted">Loading…</p>
      ) : notes.length === 0 ? (
        <div className="notes-empty">
          <FileText size={32} color="var(--text-muted)" />
          <p>No answers uploaded yet.</p>
          <p style={{ fontSize: '0.85rem' }}>Be the first — earn <strong>4 ✦</strong> when approved!</p>
        </div>
      ) : (
        <div className="notes-list">
          {notes.map(note => (
            <div key={note.id} className="notes-list-item">
              <div className="notes-list-info">
                <span className="notes-list-title">{note.title}</span>
                {note.description && <span className="notes-list-desc">{note.description}</span>}
                <span className="notes-list-meta">by {note.uploaderName} · {new Date(note.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
              <div className="notes-list-actions">
                <button className="notes-view-btn" disabled={busy === note.id} onClick={() => handleOpen(note, 'view')}>
                  <FileText size={14} /> {free ? 'View' : `View -${SPARK_VIEW_COST}✦`}
                </button>
                <button
                  className="notes-view-btn"
                  disabled={busy === note.id}
                  onClick={() => handleOpen(note, 'download')}
                  style={{ background: 'var(--surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                >
                  <Download size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && <NotesViewer note={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function NotesPage() {
  const { currentUser, openModal } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Drill-down state
  const [view,    setView]    = useState('sections');
  const [section, setSection] = useState(null);
  const [subject, setSubject] = useState(null);
  const [chapter, setChapter] = useState(null);

  // Data
  const [chapterNotes,       setChapterNotes]       = useState([]);
  const [notesLoading,       setNotesLoading]       = useState(false);
  const [sparks,             setSparks]             = useState(INITIAL_SPARKS);
  const [sparkLog,           setSparkLog]           = useState([]);
  const [purchasedChapters,  setPurchasedChapters]  = useState(new Set());
  const [purchasedNotes,     setPurchasedNotes]     = useState(null); // null = not loaded yet
  const [myNotes,            setMyNotes]            = useState(null);
  const [availableChapters,  setAvailableChapters]  = useState(new Set());

  // UI
  const [logTab,      setLogTab]      = useState('browse');
  const [viewingNote, setViewingNote] = useState(null);
  const [showUpload,     setShowUpload]     = useState(false);
  const [uploadHHTask,   setUploadHHTask]   = useState(null); // pre-fill HH task in modal
  const [tourRun, setTourRun] = useState(false);
  const [showTourPrompt, setShowTourPrompt] = useState(false);

  // Auto-prompt tour on first ever visit (replaced window.confirm with in-page modal)
  useEffect(() => {
    if (!currentUser || !isStudent) return;
    const localKey = `ux_notes-tour-v1_${currentUser.phone}`;
    const localVal = localStorage.getItem(localKey);
    // Already permanently dismissed (completed or stored 'true')
    if (localVal === 'true' || localVal === '1') return;
    // Snoozed? Check expiry
    if (localVal?.startsWith('snooze_')) {
      const until = parseInt(localVal.split('_')[1], 10);
      if (Date.now() < until) return; // still snoozed
    }
    // Also check Firestore field (loaded via currentUser)
    if (currentUser['ux_notes-tour-v1']) return;
    // Show the prompt
    setShowTourPrompt(true);
  }, [currentUser]);

  function handleTourStart() {
    setShowTourPrompt(false);
    setTourRun(true);
  }

  function handleTourSkip() {
    setShowTourPrompt(false);
    snoozeNotesTour(currentUser.phone).catch(() => {});
  }

  // Deep-link: ?noteId=<id> → auto drill-down to that chapter
  useEffect(() => {
    const noteId = searchParams.get('noteId');
    if (!noteId) return;
    getNoteById(noteId).then(note => {
      if (!note) return;
      const sec = syllabusData.find(s => s.sectionId === note.sectionId);
      const sub = sec?.subjects.find(s => s.subjectId === note.subjectId);
      const ch  = sub?.chapters.find(c => c.chapterId === note.chapterId);
      if (!sec || !sub || !ch) return;
      setSection(sec); setSubject(sub); setChapter(ch); setView('notes');
      setSearchParams({}, { replace: true }); // clean URL
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isStudent = currentUser && currentUser.role !== ROLES.TEACHER;

  // Load sparks + purchased chapters on mount
  useEffect(() => {
    if (!currentUser || !isStudent) return;
    getSparks(currentUser.phone).then(setSparks).catch(() => {});
    getPurchasedChapters(currentUser.phone)
      .then(ids => setPurchasedChapters(new Set(ids)))
      .catch(() => {});
      
    getPublishedNotes()
      .then(notes => setAvailableChapters(new Set(notes.map(n => n.chapterId))))
      .catch(() => {});
  }, [currentUser]);

  // Load notes when chapter selected
  useEffect(() => {
    if (view !== 'notes' || !chapter) return;
    setNotesLoading(true);
    getNotesByChapter(chapter.chapterId)
      .then(setChapterNotes)
      .catch(() => setChapterNotes([]))
      .finally(() => setNotesLoading(false));
  }, [chapter, view]);

  // Load purchased notes tab
  useEffect(() => {
    if (logTab !== 'purchases' || !currentUser || !isStudent) return;
    if (purchasedChapters.size === 0) { setPurchasedNotes([]); return; }
    getPublishedNotes()
      .then(all => setPurchasedNotes(all.filter(n => purchasedChapters.has(n.chapterId))))
      .catch(() => setPurchasedNotes([]));
  }, [logTab, purchasedChapters]);

  // Load my submissions
  useEffect(() => {
    if (logTab !== 'mysubmissions' || !currentUser || !isStudent) return;
    getMyNotes(currentUser.phone).then(setMyNotes).catch(() => setMyNotes([]));
  }, [logTab]);

  // Load spark log
  useEffect(() => {
    if (logTab !== 'log' || !currentUser || !isStudent) return;
    getSparkLog(currentUser.phone).then(setSparkLog).catch(() => {});
  }, [logTab]);

  function goSection(sec) { setSection(sec); setView('subjects'); }
  function goSubject(sub) { setSubject(sub); setView('chapters'); }
  function goChapter(ch)  { setChapter(ch);  setView('notes'); }

  function goBack() {
    if (view === 'notes')         { setView('chapters'); setChapter(null); setChapterNotes([]); }
    else if (view === 'chapters') { setView('subjects'); setSubject(null); }
    else if (view === 'subjects') { setView('sections'); setSection(null); }
    else if (view === 'hh-notes') { setView('hh-tasks'); setChapter(null); }
    else if (view === 'hh-tasks') { setView('sections'); setSection(null); }
  }

  async function handleView(note) {
    if (!currentUser) { openModal(); return; }
    if (!isStudent) return;

    if (purchasedChapters.has(note.chapterId)) {
      logActivity(currentUser.phone, `Notes: viewed "${note.title}" (${note.chapterName})`);
      setViewingNote(note);
      return;
    }

    if (sparks < SPARK_VIEW_COST) {
      alert(`You need ${SPARK_VIEW_COST} ✦ Sparks to unlock this chapter. Upload notes to earn more!`);
      return;
    }
    const newBal = await spendSparks(currentUser.phone, SPARK_VIEW_COST, `Unlocked chapter: ${note.chapterName}`);
    await purchaseChapter(currentUser.phone, note.chapterId);
    logActivity(currentUser.phone, `Notes: unlocked chapter "${note.chapterName}" (${note.subjectName})`);
    setSparks(newBal);
    setPurchasedChapters(prev => new Set([...prev, note.chapterId]));
    setViewingNote(note);
  }

  // ── Shared forced-download helper ──────────────────────────────
  // <a href download> does NOT force download for cross-origin URLs in Chrome.
  // We must fetch the file ourselves, create a blob, then trigger the download.
  async function forcePdfDownload(url, title) {
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `${(title || 'notes').replace(/[/\\:*?"<>|]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
    } catch (err) {
      console.error('Download failed, opening as fallback:', err);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async function handleDownload(note) {
    if (!currentUser) { openModal(); return; }
    if (!isStudent) return;

    if (!purchasedChapters.has(note.chapterId)) {
      if (sparks < SPARK_VIEW_COST) {
        alert(`You need ${SPARK_VIEW_COST} ✦ Sparks. Upload notes to earn more!`);
        return;
      }
      const newBal = await spendSparks(currentUser.phone, SPARK_VIEW_COST, `Unlocked chapter: ${note.chapterName}`);
      await purchaseChapter(currentUser.phone, note.chapterId);
      logActivity(currentUser.phone, `Notes: downloaded "${note.title}" (${note.chapterName})`);
      setSparks(newBal);
      setPurchasedChapters(prev => new Set([...prev, note.chapterId]));
    }
    await forcePdfDownload(note.blobUrl, note.title);
  }

  function onUploadSuccess() {
    setShowUpload(false);
    setUploadHHTask(null);
    if (logTab === 'mysubmissions') {
      getMyNotes(currentUser.phone).then(setMyNotes).catch(() => {});
    }
  }

  function handleTourEnd() {
    setTourRun(false);
    // Mark permanently seen in both localStorage and Firestore
    markCampaignSeen('notes-tour-v1', currentUser.phone, 'both').catch(() => {});
  }

  if (!currentUser) {
    return (
      <div className="notes-login-prompt">
        <Zap size={40} color="var(--primary)" />
        <h2>Notes Exchange</h2>
        <p>Login to browse, view, and share notes with your classmates.</p>
        <button className="auth-btn primary" onClick={openModal}>Login to continue</button>
      </div>
    );
  }

  if (!isStudent) {
    return (
      <div className="notes-login-prompt">
        <h2>Notes Exchange</h2>
        <p>This section is available for students only.</p>
      </div>
    );
  }

  const breadcrumb = [section?.sectionName, subject?.subjectName, chapter?.chapterName].filter(Boolean);

  const STATUS_ICON = {
    pending:   <Clock size={13} color="#f59e0b" />,
    published: <CheckCircle size={13} color="#10b981" />,
    rejected:  <XCircle size={13} color="#ef4444" />,
  };

  // Group purchased notes by chapter for the Purchases tab
  const purchasedByChapter = purchasedNotes
    ? purchasedNotes.reduce((acc, n) => {
        if (!acc[n.chapterId]) acc[n.chapterId] = { chapterName: n.chapterName, subjectName: n.subjectName, notes: [] };
        acc[n.chapterId].notes.push(n);
        return acc;
      }, {})
    : {};

  const TABS = [
    { id: 'browse',        label: 'Browse',         tourAttr: 'tab-browse' },
    { id: 'purchases',     label: `Purchases${purchasedChapters.size ? ` (${purchasedChapters.size})` : ''}`, tourAttr: 'tab-purchases' },
    { id: 'mysubmissions', label: 'My Submissions',  tourAttr: 'tab-mysubmissions' },
    { id: 'log',           label: 'Spark Log',       tourAttr: null },
  ];

  return (
    <div className="notes-page animate-fade-in">

      {showTourPrompt && (
        <TourPromptModal onStart={handleTourStart} onSkip={handleTourSkip} />
      )}

      <TourRunner
        campaignId="notes-tour-v1"
        steps={NOTES_TOUR_STEPS}
        run={tourRun}
        variant="tour"
        onComplete={handleTourEnd}
        disableScrolling={false}
      />

      {/* Header */}
      <div className="notes-header">
        <div>
          <h1 className="notes-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <SparkIcon size={20} color="#f59e0b" /> Notes Exchange
            <button
              onClick={() => setTourRun(true)}
              title="How does this work?"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 0.1rem', display: 'flex', alignItems: 'center' }}
            >
              <HelpCircle size={17} />
            </button>
          </h1>
          <p className="notes-subtitle">Browse, view, and share chapter notes</p>
        </div>
        <SparkWallet sparks={sparks} />
      </div>

      {/* Tabs */}
      <div className="notes-tabs">
        {TABS.map(({ id, label, tourAttr }) => (
          <button
            key={id}
            className={`notes-tab ${logTab === id ? 'active' : ''}`}
            onClick={() => setLogTab(id)}
            {...(tourAttr ? { 'data-tour': tourAttr } : {})}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── BROWSE TAB ── */}
      {logTab === 'browse' && (
        <>
          {view !== 'sections' && (
            <div className="notes-breadcrumb">
              <button className="notes-back-btn" onClick={goBack}><ArrowLeft size={15} /> Back</button>
              <span className="notes-crumbs">Notes {breadcrumb.map((b, i) => <span key={i}> / {b}</span>)}</span>
            </div>
          )}

          {view === 'sections' && (
            <div className="notes-grid">
              {syllabusData.map(sec => (
                <SectionCard key={sec.sectionId} section={sec} onClick={() => goSection(sec)} />
              ))}
              {/* Holiday Homework section */}
              <button className="notes-section-card" onClick={() => { setView('hh-tasks'); setSection({ sectionId: 'holiday-hw', sectionName: 'Holiday Homework' }); }}>
                <span className="notes-section-name">🏖 Holiday Homework</span>
                <span className="notes-section-meta">{holidayData.length} assignments · classmates' answers</span>
                <ChevronRight size={16} className="notes-section-arrow" />
              </button>
            </div>
          )}

          {view === 'subjects' && section && (
            <div className="notes-list">
              {section.subjects.map(sub => (
                <button key={sub.subjectId} className="notes-row" onClick={() => goSubject(sub)}>
                  <span className="notes-row-name">{sub.subjectName}</span>
                  <span className="notes-row-meta">{sub.chapters.length} chapters</span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          )}

          {view === 'chapters' && subject && (
            <div className="notes-list">
              {subject.chapters.map(ch => (
                <button key={ch.chapterId} className="notes-row" onClick={() => goChapter(ch)}>
                  <span className="notes-row-name">
                    {ch.chapterName}
                    {availableChapters.has(ch.chapterId) && <span style={{display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', marginLeft: '6px', verticalAlign: 'middle'}} title="Notes available"></span>}
                  </span>
                  {purchasedChapters.has(ch.chapterId)
                    ? <span style={{ fontSize: '0.75rem', color: '#10b981' }}>✓ Unlocked</span>
                    : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-{SPARK_VIEW_COST}✦</span>}
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          )}

          {view === 'notes' && chapter && (
            <div>
              <h3 className="notes-chapter-title">
                {chapter.chapterName}
                {purchasedChapters.has(chapter.chapterId) && (
                  <span style={{ fontSize: '0.75rem', color: '#10b981', marginLeft: '0.5rem' }}>✓ Unlocked</span>
                )}
              </h3>
              {notesLoading ? (
                <p className="notes-muted">Loading notes…</p>
              ) : chapterNotes.length === 0 ? (
                <div className="notes-empty">
                  <FileText size={32} color="var(--text-muted)" />
                  <p>No notes for this chapter yet.</p>
                  <p style={{ fontSize: '0.85rem' }}>Be the first to upload! Earn <strong>4 ✦</strong> when approved.</p>
                </div>
              ) : (
                <div className="notes-list">
                  {chapterNotes.map(note => (
                    <NotesListItem
                      key={note.id}
                      note={note}
                      onView={handleView}
                      onDownload={handleDownload}
                      free={purchasedChapters.has(note.chapterId)}
                      sparks={sparks}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── HOLIDAY HOMEWORK: task list ── */}
          {view === 'hh-tasks' && (
            <div className="notes-list">
              {holidayData.map(task => (
                <button key={task.id} className="notes-row" onClick={() => { setChapter({ chapterId: `hh-${task.id}`, chapterName: task.subject }); setView('hh-notes'); }}>
                  <span className="notes-row-name">
                    {task.subject}
                    {availableChapters.has(`hh-${task.id}`) && <span style={{display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', marginLeft: '6px', verticalAlign: 'middle'}} title="Answers available"></span>}
                  </span>
                  <span className="notes-row-meta" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.message}
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          )}

          {/* ── HOLIDAY HOMEWORK: answers for a task ── */}
          {view === 'hh-notes' && chapter && (
            <HHNotesView
              task={chapter}
              currentUser={currentUser}
              sparks={sparks}
              setSparks={setSparks}
              purchasedChapters={purchasedChapters}
              setPurchasedChapters={setPurchasedChapters}
              onUpload={() => {
                const hhTask = holidayData.find(t => `hh-${t.id}` === chapter.chapterId);
                setUploadHHTask(hhTask || null);
                setShowUpload(true);
              }}
            />
          )}
        </>
      )}

      {/* ── PURCHASES TAB ── */}
      {logTab === 'purchases' && (
        <div>
          {purchasedNotes === null ? (
            <p className="notes-muted">Loading…</p>
          ) : purchasedNotes.length === 0 ? (
            <div className="notes-empty">
              <FileText size={32} color="var(--text-muted)" />
              <p>No purchases yet.</p>
              <p style={{ fontSize: '0.85rem' }}>Browse notes and spend Sparks to unlock chapters. They'll appear here for free re-reading.</p>
            </div>
          ) : (
            <div className="notes-list">
              {Object.entries(purchasedByChapter).map(([chId, { chapterName, subjectName, notes }]) => (
                <div key={chId} style={{ marginBottom: '1rem' }}>
                  <div style={{ padding: '0.4rem 0', borderBottom: '1px solid var(--border)', marginBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{chapterName}</span>
                    <span className="notes-list-meta" style={{ marginLeft: '0.5rem' }}>{subjectName}</span>
                    <span style={{ fontSize: '0.75rem', color: '#10b981', marginLeft: '0.5rem' }}>✓ Unlocked</span>
                  </div>
                  {notes.map(note => (
                    <NotesListItem key={note.id} note={note} onView={handleView} onDownload={handleDownload} free sparks={sparks} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MY SUBMISSIONS TAB ── */}
      {logTab === 'mysubmissions' && (
        <div>
          {myNotes === null ? (
            <p className="notes-muted">Loading…</p>
          ) : myNotes.length === 0 ? (
            <p className="notes-muted">You haven't submitted any notes yet.</p>
          ) : (
            <div className="notes-list">
              {myNotes.map(n => (
                <div key={n.id} className="notes-submission-row" style={n.status === 'rejected' ? { borderColor: '#ef444440' } : {}}>
                  <div className="notes-submission-info">
                    <span className="notes-list-title">{n.title}</span>
                    <span className="notes-list-meta">{n.subjectName} · {n.chapterName}</span>
                    {n.status === 'rejected' && (
                      <span style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.2rem' }}>
                        ⚠ {n.rejectionReason ? `Admin: ${n.rejectionReason}` : 'Rejected by admin'}
                      </span>
                    )}
                  </div>
                  <div className="notes-submission-status">
                    {STATUS_ICON[n.status]}
                    <span className={`notes-status-label ${n.status}`}>{n.status}</span>
                    {n.status === 'published' && <span className="notes-earned">+4 ✦</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SPARK LOG TAB ── */}
      {logTab === 'log' && (
        <div>
          <div className="spark-log-balance-row">
            <SparkIcon size={18} color="#f59e0b" />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{sparks} Sparks</span>
          </div>
          {sparkLog.length === 0 ? (
            <p className="notes-muted">No transactions yet.</p>
          ) : (
            <div className="spark-log-list">
              {sparkLog.map((entry, i) => <SparkLogItem key={i} entry={entry} />)}
            </div>
          )}
        </div>
      )}

      {/* Upload FAB */}
      <button className="notes-upload-fab" data-tour="upload-fab" onClick={() => setShowUpload(true)} title="Upload Notes">
        <Upload size={20} />
      </button>

      {viewingNote && <NotesViewer note={viewingNote} onClose={() => setViewingNote(null)} />}
      {showUpload && (
        <UploadNoteModal
          currentUser={currentUser}
          defaultHHTask={uploadHHTask}
          onClose={() => { setShowUpload(false); setUploadHHTask(null); }}
          onSuccess={onUploadSuccess}
        />
      )}
    </div>
  );
}
