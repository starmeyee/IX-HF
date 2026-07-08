import { useState, useEffect, useMemo, useCallback } from 'react';
import { BookMarked, ChevronRight, Lock, Loader2, Check, Info } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useStarBatchRouteGuard } from '../auth/starBatchAccess';
import SyllabusProgressBar from '../components/SyllabusProgressBar';
import { getSyllabus, getCompletedTopics } from '../services/syllabusService';
import { getCheckedTopics, setCheckedTopics } from '../auth/authService';
import {
  statsForTopics, sectionTopics, subjectTopics, chapterTopics,
} from '../data/syllabusStats';

/**
 * Drill-down syllabus tracker.
 *
 * Levels:
 *   sections  → list of 6 sections, each with a dual progress bar
 *   subjects  → subjects within a chosen section
 *   chapters  → chapters within a chosen subject, each expandable to topics
 *
 * Students can tick a topic to mark it "checked" ONLY if the monitor has
 * already marked it "completed". Uncompleted topics render locked.
 *
 * Render helpers are plain functions returning JSX (not components) so React
 * does not remount them and reset state on every parent render.
 */
export default function SyllabusPage() {
  useStarBatchRouteGuard();
  const { currentUser, openModal } = useAuth();

  const [sections, setSections] = useState(null); // null = loading
  const [completedList, setCompletedList] = useState([]);
  const [checkedSetState, setCheckedSetState] = useState(new Set());

  // Navigation state
  const [sectionId, setSectionId] = useState(null);
  const [subjectId, setSubjectId] = useState(null);
  const [openChapter, setOpenChapter] = useState(null); // chapterId currently expanded

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    Promise.all([
      getSyllabus(),
      getCompletedTopics(),
      getCheckedTopics(currentUser.phone),
    ])
      .then(([secs, completed, checked]) => {
        if (!active) return;
        setSections(secs);
        setCompletedList(completed);
        setCheckedSetState(new Set(checked));
      })
      .catch((err) => { console.error(err); if (active) setSections([]); });
    return () => { active = false; };
  }, [currentUser]);

  const completedSet = useMemo(() => new Set(completedList), [completedList]);

  const toggleChecked = useCallback((topicId) => {
    if (!currentUser) return;
    // Guard: cannot check a topic that isn't completed.
    if (!completedSet.has(topicId)) return;
    setCheckedSetState((prev) => {
      const next = new Set(prev);
      next.has(topicId) ? next.delete(topicId) : next.add(topicId);
      setCheckedTopics(currentUser.phone, Array.from(next)).catch(console.error);
      return next;
    });
  }, [currentUser, completedSet]);

  if (!currentUser) {
    return (
      <div className="animate-fade-in fade-in-up" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <Lock size={48} color="var(--tertiary)" style={{ margin: '0 auto 1rem auto' }} />
        <h1 className="page-title text-gradient">Locked Portal</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          You must be logged in to view the syllabus tracker.
        </p>
        <button className="auth-btn primary" onClick={openModal} style={{ margin: '0 auto' }}>Login / Register</button>
      </div>
    );
  }

  if (sections === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Loader2 size={32} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  const activeSection = sections.find((s) => s.sectionId === sectionId) || null;
  const activeSubject = activeSection?.subjects.find((s) => s.subjectId === subjectId) || null;

  // ── Render helpers (plain functions, not components) ─────────
  const renderBreadcrumb = () => (
    <div className="syllabus-breadcrumb">
      <button className="syllabus-crumb-btn" onClick={() => { setSectionId(null); setSubjectId(null); setOpenChapter(null); }}>
        All Sections
      </button>
      {activeSection && (
        <>
          <ChevronRight size={14} className="syllabus-crumb-sep" />
          {activeSubject ? (
            <button className="syllabus-crumb-btn" onClick={() => { setSubjectId(null); setOpenChapter(null); }}>
              {activeSection.sectionName}
            </button>
          ) : (
            <span className="syllabus-crumb-current">{activeSection.sectionName}</span>
          )}
        </>
      )}
      {activeSubject && (
        <>
          <ChevronRight size={14} className="syllabus-crumb-sep" />
          <span className="syllabus-crumb-current">{activeSubject.subjectName}</span>
        </>
      )}
    </div>
  );

  const renderSectionList = () => (
    <div>
      {sections.map((section) => {
        const stats = statsForTopics(sectionTopics(section), completedSet, checkedSetState);
        return (
          <button
            key={section.sectionId}
            className="syllabus-row"
            onClick={() => { setSectionId(section.sectionId); setOpenChapter(null); }}
          >
            <div className="syllabus-row-head">
              <h3 className="syllabus-row-title">{section.sectionName}</h3>
              <ChevronRight size={18} className="syllabus-row-chevron" />
            </div>
            <SyllabusProgressBar
              completed={stats.completedPct}
              checked={stats.checkedPct}
              sublabel={`${stats.completed}/${stats.total} done`}
              size="sm"
            />
          </button>
        );
      })}
    </div>
  );

  const renderSubjectList = () => (
    <div>
      {activeSection.subjects.map((subject) => {
        const stats = statsForTopics(subjectTopics(subject), completedSet, checkedSetState);
        return (
          <button
            key={subject.subjectId}
            className="syllabus-row"
            onClick={() => { setSubjectId(subject.subjectId); setOpenChapter(null); }}
          >
            <div className="syllabus-row-head">
              <h3 className="syllabus-row-title">{subject.subjectName}</h3>
              <ChevronRight size={18} className="syllabus-row-chevron" />
            </div>
            <SyllabusProgressBar
              completed={stats.completedPct}
              checked={stats.checkedPct}
              sublabel={`${stats.completed}/${stats.total} done`}
              size="sm"
            />
          </button>
        );
      })}
    </div>
  );

  const renderChapterList = () => (
    <div>
      <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
        <Info size={13} /> Tap a completed (green) topic to mark your copy as checked.
      </p>
      {activeSubject.chapters.map((chapter) => {
        const stats = statsForTopics(chapterTopics(chapter), completedSet, checkedSetState);
        const isOpen = openChapter === chapter.chapterId;
        return (
          <div key={chapter.chapterId} className="syllabus-row" style={{ cursor: 'default' }}>
            <button
              onClick={() => setOpenChapter(isOpen ? null : chapter.chapterId)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
            >
              <div className="syllabus-row-head">
                <h3 className="syllabus-row-title">{chapter.chapterName}</h3>
                <ChevronRight
                  size={18}
                  className="syllabus-row-chevron"
                  style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                />
              </div>
              <SyllabusProgressBar
                completed={stats.completedPct}
                checked={stats.checkedPct}
                sublabel={`${stats.completed}/${stats.total} done`}
                size="sm"
              />
            </button>

            {isOpen && (
              <div style={{ marginTop: '0.5rem' }}>
                {chapter.topics.map((topic) => {
                  const isCompleted = completedSet.has(topic.topicId);
                  const isChecked = checkedSetState.has(topic.topicId) && isCompleted;
                  const cls = `syllabus-topic ${isCompleted ? 'checkable' : 'locked'}`;
                  return (
                    <button
                      key={topic.topicId}
                      className={cls}
                      onClick={() => toggleChecked(topic.topicId)}
                      disabled={!isCompleted}
                      title={isCompleted ? (isChecked ? 'Checked — tap to uncheck' : 'Tap to mark as checked') : 'Not completed by monitor yet'}
                    >
                      <span className={`syllabus-topic-box ${isChecked ? 'checked' : isCompleted ? 'completed-only' : ''}`}>
                        {isChecked && <Check size={13} color="#fff" strokeWidth={3} />}
                      </span>
                      <span className="syllabus-topic-name">{topic.topicName}</span>
                      <span className={`syllabus-topic-tag ${isCompleted ? 'completed' : 'pending'}`}>
                        {isCompleted ? 'Completed' : 'Pending'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="animate-fade-in fade-in-up">
      <h1 className="page-title text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <BookMarked size={28} /> Syllabus Tracker
      </h1>

      {renderBreadcrumb()}

      {!activeSection && renderSectionList()}
      {activeSection && !activeSubject && renderSubjectList()}
      {activeSubject && renderChapterList()}
    </div>
  );
}
