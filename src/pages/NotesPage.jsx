import { useState, useEffect } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { ChevronRight, ArrowLeft, Upload, FileText, Clock, CheckCircle, XCircle, Zap, HelpCircle, Share2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roles';
import { syllabusData } from '../data/syllabusData';
import { getNotesByChapter, getMyNotes, getPublishedNotes } from '../services/notesService';
import {
  getSparks, getSparkLog, spendSparks,
  getPurchasedChapters, purchaseChapter,
  SPARK_VIEW_COST, INITIAL_SPARKS,
} from '../services/sparksService';
import { logActivity } from '../services/adminService';
import NotesViewer from '../components/NotesViewer';
import UploadNoteModal from '../components/UploadNoteModal';

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

function NotesListItem({ note, onView, free }) {
  return (
    <div className="notes-list-item">
      <div className="notes-list-info">
        <span className="notes-list-title">{note.title}</span>
        {note.description && <span className="notes-list-desc">{note.description}</span>}
        <span className="notes-list-meta">by {note.uploaderName} · {new Date(note.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
      </div>
      <div className="notes-list-actions">
        <button className="notes-view-btn" onClick={() => onView(note)}>
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
        <a
          className="notes-view-btn"
          href={note.blobUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: 'none', background: 'var(--surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >⬇</a>
      </div>
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

// ── Joyride steps ─────────────────────────────────────────────
const TOUR_STEPS = [
  {
    target: '[data-tour="spark-wallet"]',
    title: '⚡ Your Sparks',
    content: 'Sparks are your currency here. You start with 10. Spend them to read notes, earn them back by uploading your own.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '[data-tour="tab-browse"]',
    title: '📚 Browse Notes',
    content: 'Tap here to find notes. Go Section → Subject → Chapter. Opening a chapter for the first time costs 2 Sparks — after that it\'s free forever.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tab-purchases"]',
    title: '🔓 Your Purchases',
    content: 'Every chapter you\'ve already unlocked lives here. Come back anytime to re-read them — totally free, no extra Sparks needed.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tab-mysubmissions"]',
    title: '📤 My Submissions',
    content: 'See the notes you\'ve uploaded here. Once the admin approves one, you automatically get +4 Sparks.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="upload-fab"]',
    title: '➕ Upload Notes',
    content: 'Have good notes? Upload a PDF for any chapter. Submit it — if the admin approves, you earn 4 Sparks. Tap the ? anytime to see this guide again.',
    placement: 'top',
  },
].map((s, i, arr) => ({ ...s, totalSteps: arr.length }));

// Simple tooltip matching the project's custom tooltip style
function TourTooltip({ index, step, backProps, closeProps, primaryProps, tooltipProps, isLastStep }) {
  return (
    <div {...tooltipProps} className="custom-tooltip spring-up">
      <div className="tooltip-header stagger-1">
        <h3 className="tooltip-title" style={{ background: 'linear-gradient(135deg, var(--primary), #a78bfa)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
          {step.title}
        </h3>
      </div>
      <div className="tooltip-body stagger-2">{step.content}</div>
      <div className="tooltip-footer stagger-3">
        <div className="tooltip-progress">{index + 1} / {step.totalSteps}</div>
        <div className="tooltip-controls">
          {!isLastStep && <button {...closeProps} className="tooltip-skip">Skip</button>}
          {index > 0 && <button {...backProps} className="tooltip-btn secondary">Back</button>}
          <button {...primaryProps} className="tooltip-btn primary">{isLastStep ? 'Finish' : 'Next'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function NotesPage() {
  const { currentUser, openModal } = useAuth();

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

  // UI
  const [logTab,      setLogTab]      = useState('browse');
  const [viewingNote, setViewingNote] = useState(null);
  const [showUpload,  setShowUpload]  = useState(false);
  const [tourRun,     setTourRun]     = useState(false);

  // Auto-run tour on first ever visit to Notes page
  useEffect(() => {
    if (!currentUser || !isStudent) return;
    const key = `notes_tour_done_${currentUser.phone}`;
    if (!localStorage.getItem(key)) setTourRun(true);
  }, [currentUser]);

  const isStudent = currentUser && currentUser.role !== ROLES.TEACHER;

  // Load sparks + purchased chapters on mount
  useEffect(() => {
    if (!currentUser || !isStudent) return;
    getSparks(currentUser.phone).then(setSparks).catch(() => {});
    getPurchasedChapters(currentUser.phone)
      .then(ids => setPurchasedChapters(new Set(ids)))
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
  }

  async function handleView(note) {
    if (!currentUser) { openModal(); return; }
    if (!isStudent) return;

    // Already purchased this chapter — free
    if (purchasedChapters.has(note.chapterId)) {
      logActivity(currentUser.phone, `Notes: viewed "${note.title}" (${note.chapterName})`);
      setViewingNote(note);
      return;
    }

    // Charge sparks and record purchase
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

  function onUploadSuccess() {
    setShowUpload(false);
    if (logTab === 'mysubmissions') {
      getMyNotes(currentUser.phone).then(setMyNotes).catch(() => {});
    }
  }

  function handleTourEnd({ status }) {
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setTourRun(false);
      localStorage.setItem(`notes_tour_done_${currentUser.phone}`, '1');
    }
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

      <Joyride
        steps={TOUR_STEPS}
        run={tourRun}
        continuous
        tooltipComponent={TourTooltip}
        callback={handleTourEnd}
        styles={{ options: { overlayColor: 'rgba(0,0,0,0.65)', zIndex: 10000 } }}
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
                  <span className="notes-row-name">{ch.chapterName}</span>
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
                      free={purchasedChapters.has(note.chapterId)}
                    />
                  ))}
                </div>
              )}
            </div>
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
                    <NotesListItem key={note.id} note={note} onView={handleView} free />
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
          onClose={() => setShowUpload(false)}
          onSuccess={onUploadSuccess}
        />
      )}
    </div>
  );
}
