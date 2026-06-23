import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Upload, FileText, Clock, CheckCircle, XCircle, Zap } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roles';
import { syllabusData } from '../data/syllabusData';
import { getNotesByChapter, getMyNotes } from '../services/notesService';
import { getSparks, getSparkLog, spendSparks, SPARK_VIEW_COST, INITIAL_SPARKS } from '../services/sparksService';
import NotesViewer from '../components/NotesViewer';
import UploadNoteModal from '../components/UploadNoteModal';

// Spark icon SVG
export function SparkIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}>
      <path d="M8 1L3 8h4l-1 5 6-7H8l1-5z" fill={color} stroke={color} strokeWidth="0.5" strokeLinejoin="round" />
    </svg>
  );
}

function SparkWallet({ sparks }) {
  return (
    <div className="spark-wallet">
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

function NotesListItem({ note, onView }) {
  return (
    <div className="notes-list-item">
      <div className="notes-list-info">
        <span className="notes-list-title">{note.title}</span>
        {note.description && <span className="notes-list-desc">{note.description}</span>}
        <span className="notes-list-meta">by {note.uploaderName} · {new Date(note.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
      </div>
      <button className="notes-view-btn" onClick={() => onView(note)}>
        <FileText size={14} /> View <span className="notes-cost">-{SPARK_VIEW_COST}✦</span>
      </button>
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

// ── Main Page ─────────────────────────────────────────────────
export default function NotesPage() {
  const { currentUser, openModal } = useAuth();
  const navigate = useNavigate();

  // Drill-down state
  const [view,    setView]    = useState('sections'); // sections | subjects | chapters | notes
  const [section, setSection] = useState(null);
  const [subject, setSubject] = useState(null);
  const [chapter, setChapter] = useState(null);

  // Data state
  const [chapterNotes, setChapterNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteCounts,   setNoteCounts]   = useState({}); // chapterId → count (lazy)

  // Sparks
  const [sparks,    setSparks]    = useState(INITIAL_SPARKS);
  const [sparkLog,  setSparkLog]  = useState([]);
  const [logTab,    setLogTab]    = useState('browse'); // browse | mysubmissions | log

  // Modals
  const [viewingNote, setViewingNote]   = useState(null);
  const [showUpload,  setShowUpload]    = useState(false);

  // My submissions
  const [myNotes, setMyNotes] = useState(null);

  const isStudent = currentUser && currentUser.role !== ROLES.TEACHER;

  // Load sparks
  useEffect(() => {
    if (!currentUser || !isStudent) return;
    getSparks(currentUser.phone).then(setSparks).catch(() => {});
    getSparkLog(currentUser.phone).then(setSparkLog).catch(() => {});
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
    if (view === 'notes')    { setView('chapters'); setChapter(null); setChapterNotes([]); }
    else if (view === 'chapters') { setView('subjects'); setSubject(null); }
    else if (view === 'subjects') { setView('sections'); setSection(null); }
  }

  async function handleView(note) {
    if (!currentUser) { openModal(); return; }
    if (!isStudent) return;
    const sessionKey = `viewed_${note.id}`;
    const alreadyViewed = sessionStorage.getItem(sessionKey);

    if (!alreadyViewed) {
      if (sparks < SPARK_VIEW_COST) {
        alert(`You need ${SPARK_VIEW_COST} ✦ Sparks to view notes. Upload notes to earn more!`);
        return;
      }
      const newBal = await spendSparks(currentUser.phone, SPARK_VIEW_COST, `Viewed: ${note.title}`);
      setSparks(newBal);
      sessionStorage.setItem(sessionKey, '1');
    }
    setViewingNote(note);
  }

  function onUploadSuccess() {
    setShowUpload(false);
    // Refresh my submissions if open
    if (logTab === 'mysubmissions') {
      getMyNotes(currentUser.phone).then(setMyNotes).catch(() => {});
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

  const breadcrumb = [
    section && section.sectionName,
    subject && subject.subjectName,
    chapter && chapter.chapterName,
  ].filter(Boolean);

  const STATUS_ICON = {
    pending:   <Clock size={13} color="#f59e0b" />,
    published: <CheckCircle size={13} color="#10b981" />,
    rejected:  <XCircle size={13} color="#ef4444" />,
  };

  return (
    <div className="notes-page animate-fade-in">

      {/* Header */}
      <div className="notes-header">
        <div>
          <h1 className="notes-title">
            <SparkIcon size={20} color="#f59e0b" /> Notes Exchange
          </h1>
          <p className="notes-subtitle">Browse, view, and share chapter notes</p>
        </div>
        <SparkWallet sparks={sparks} />
      </div>

      {/* Tabs */}
      <div className="notes-tabs">
        {[['browse', 'Browse'], ['mysubmissions', 'My Submissions'], ['log', 'Spark Log']].map(([id, label]) => (
          <button key={id} className={`notes-tab ${logTab === id ? 'active' : ''}`} onClick={() => setLogTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── BROWSE TAB ── */}
      {logTab === 'browse' && (
        <>
          {/* Breadcrumb + back */}
          {view !== 'sections' && (
            <div className="notes-breadcrumb">
              <button className="notes-back-btn" onClick={goBack}>
                <ArrowLeft size={15} /> Back
              </button>
              <span className="notes-crumbs">
                Notes {breadcrumb.map((b, i) => (
                  <span key={i}> / {b}</span>
                ))}
              </span>
            </div>
          )}

          {/* Sections grid */}
          {view === 'sections' && (
            <div className="notes-grid">
              {syllabusData.map(sec => (
                <SectionCard key={sec.sectionId} section={sec} onClick={() => goSection(sec)} />
              ))}
            </div>
          )}

          {/* Subjects list */}
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

          {/* Chapters list */}
          {view === 'chapters' && subject && (
            <div className="notes-list">
              {subject.chapters.map(ch => (
                <button key={ch.chapterId} className="notes-row" onClick={() => goChapter(ch)}>
                  <span className="notes-row-name">{ch.chapterName}</span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          )}

          {/* Notes list */}
          {view === 'notes' && chapter && (
            <div>
              <h3 className="notes-chapter-title">{chapter.chapterName}</h3>
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
                    <NotesListItem key={note.id} note={note} onView={handleView} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
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
                <div key={n.id} className="notes-submission-row">
                  <div className="notes-submission-info">
                    <span className="notes-list-title">{n.title}</span>
                    <span className="notes-list-meta">{n.subjectName} · {n.chapterName}</span>
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
      <button className="notes-upload-fab" onClick={() => setShowUpload(true)} title="Upload Notes">
        <Upload size={20} />
      </button>

      {/* Notes viewer modal */}
      {viewingNote && (
        <NotesViewer note={viewingNote} onClose={() => setViewingNote(null)} />
      )}

      {/* Upload modal */}
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
