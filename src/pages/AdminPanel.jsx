import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, Plus, Save, Trash2, Megaphone, Bold, Italic, List, Pencil, X, CalendarX, BookMarked, ChevronRight, Check, Send, ClipboardList, Users, Mail, Bell, RefreshCw, MousePointerClick, Eye, EyeOff, Link as LinkIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import FormatToolbar from '../components/FormatToolbar';
import NoticeText from '../components/NoticeText';
import CopyWhatsAppButton from '../components/CopyWhatsAppButton';
import { stripFormatting } from '../utils/whatsappFormat';
import SyllabusProgressBar from '../components/SyllabusProgressBar';
import { addHomework } from '../services/homeworkService';
import { getNotices, addNotice, updateNotice, deleteNotice } from '../services/noticeService';
import { getClosedDays, addClosedDay, removeClosedDay } from '../services/calendarOverrideService';
import { getSyllabus, getCompletedTopics, setCompletedBulk, toggleCompletedTopic, addTopicToChapter, deleteTopicFromChapter, hideBaseTopic } from '../services/syllabusService';
import { getClasswork, setClasswork } from '../services/classworkService';
import { getPeriodsForDate, weekdayName } from '../data/routine';
import { notifyClass, notifyClassSafe } from '../services/notify';
import { statsForTopics, chapterTopics } from '../data/syllabusStats';
import { isWorkingDay, fromDateKey } from '../data/attendanceUtils';
import { ROLES, TEST_PHONE } from '../auth/roles';
import { getAllUsers } from '../services/adminService';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { getCTABannerConfig, saveCTABannerConfig, getCTAClicks } from '../services/ctaBannerService';
import { getClassConfig, updateClassConfig } from '../services/classConfigService';

function canAccess(user) {
  return user && (user.isAdmin || user.role === ROLES.MONITOR || user.role === ROLES.ADMIN);
}

function isAdminUser(user) {
  return user && (user.isAdmin || user.role === ROLES.ADMIN);
}

// ── Notices section ────────────────────────────────────────────
function NoticesManager({ currentUser }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await addNotice({ body, authorName: currentUser.name, authorPhone: currentUser.phone });
      // Fire-and-forget push to the class (admin only; safe no-op otherwise).
      const preview = stripFormatting(body, 120);
      notifyClassSafe(currentUser, { title: '📢 New Notice', body: preview, url: '/', type: 'notice' });
      setBody('');
      alert('Notice posted successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save notice: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-card" style={{ marginBottom: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
        <Megaphone size={20} /> Post a Notice
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <FormatToolbar textareaRef={textareaRef} body={body} setBody={setBody} />

        <textarea
          ref={textareaRef}
          placeholder="Write your notice… Use the toolbar for *bold*, _italic_, lists and more (WhatsApp style)."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          required
          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
        />

        {body.trim() && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Preview</span>
            <div style={{ marginTop: '0.5rem' }}>
              <NoticeText>{body}</NoticeText>
            </div>
          </div>
        )}

        <button type="submit" disabled={busy} className="auth-btn primary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
          <Save size={16} /> {busy ? 'Posting…' : 'Post Notice'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <Link to="/manage-notices" className="auth-btn secondary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
          <Megaphone size={16} /> View all posted notices
        </Link>
      </div>
    </div>
  );
}

// ── Homework section ───────────────────────────────────────────
function HomeworkManager({ currentUser }) {
  const [date, setDate] = useState('');
  const [tasks, setTasks] = useState([{ subject: '', description: '', type: 'homework' }]);
  const [loading, setLoading] = useState(false);

  const handleAddTask = () => setTasks([...tasks, { subject: '', description: '', type: 'homework' }]);
  const handleRemoveTask = (index) => setTasks(tasks.filter((_, i) => i !== index));
  const handleTaskChange = (index, field, value) => {
    const newTasks = [...tasks];
    newTasks[index][field] = value;
    setTasks(newTasks);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || tasks.length === 0) return alert('Please enter date and at least one task');
    if (!window.confirm(`Post homework for ${date} with ${tasks.length} task(s)?`)) return;
    setLoading(true);
    try {
      await addHomework(date, tasks, currentUser?.phone === TEST_PHONE);
      // Fire-and-forget push (admin only; safe no-op otherwise).
      const subjects = tasks.map((t) => t.subject).filter(Boolean).join(', ');
      notifyClassSafe(currentUser, {
        title: '📚 Homework Updated',
        body: subjects ? `New tasks: ${subjects}` : 'New homework has been posted.',
        url: '/homework',
        type: 'homework',
      });
      alert('Homework added successfully!');
      setDate('');
      setTasks([{ subject: '', description: '', type: 'homework' }]);
    } catch (err) {
      console.error(err);
      alert('Failed to add homework: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="glass-card" style={{ marginBottom: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
        <Plus size={20} /> Add Daily Homework
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <label style={{ color: 'var(--text-secondary)' }}>Tasks</label>
            <button type="button" onClick={handleAddTask} className="auth-btn secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
              <Plus size={14} style={{ display: 'inline', marginRight: '0.25rem' }} /> Add Task
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tasks.map((task, index) => (
              <div key={index} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>Task {index + 1}</h4>
                  {tasks.length > 1 && (
                    <button type="button" onClick={() => handleRemoveTask(index)} style={{ background: 'none', border: 'none', color: 'var(--error, #ef4444)', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Subject (e.g., Math, Science)"
                  value={task.subject}
                  onChange={e => handleTaskChange(index, 'subject', e.target.value)}
                  required
                  style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                />
                <textarea
                  placeholder="Task Description..."
                  value={task.description}
                  onChange={e => handleTaskChange(index, 'description', e.target.value)}
                  required
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', resize: 'vertical' }}
                />
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="auth-btn primary" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
          <Save size={18} /> {loading ? 'Saving...' : 'Save Homework'}
        </button>
      </form>
    </div>
  );
}

// ── Calendar Override section ──────────────────────────────────
function CalendarOverrideManager() {
  const [closedDays, setClosedDaysState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateInput, setDateInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getClosedDays()
      .then((days) => { if (active) setClosedDaysState(days); })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    if (!dateInput) return;

    // Guard: don't allow marking a day that's already a holiday/Sunday.
    if (!isWorkingDay(dateInput)) {
      setError('That date is already a holiday or Sunday in the school calendar.');
      return;
    }
    setBusy(true);
    try {
      await addClosedDay(dateInput);
      setDateInput('');
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      setError('Failed to add: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(key) {
    if (!window.confirm(`Restore ${formatHuman(key)} as a working day? It will count toward attendance again.`)) return;
    try {
      await removeClosedDay(key);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      alert('Failed to remove: ' + err.message);
    }
  }

  function formatHuman(key) {
    return fromDateKey(key).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  return (
    <div className="glass-card" style={{ marginBottom: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
        <CalendarX size={20} /> Calendar Override
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
        Declare an extra holiday on a working day (e.g. an unplanned closure). It is removed from everyone's attendance immediately.
      </p>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <input
          type="date"
          value={dateInput}
          onChange={(e) => { setDateInput(e.target.value); setError(''); }}
          required
          style={{ flex: '1 1 200px', padding: '0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
        />
        <button type="submit" disabled={busy} className="auth-btn primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: 0 }}>
          <Plus size={16} /> {busy ? 'Adding…' : 'Mark Closed'}
        </button>
      </form>
      {error && <p className="auth-err" style={{ marginTop: '0.75rem' }}>{error}</p>}

      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Declared Closures {closedDays.length > 0 && `(${closedDays.length})`}
        </h3>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : closedDays.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No extra closures declared.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {closedDays.map((key) => (
              <span
                key={key}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '0.4rem 0.75rem', borderRadius: '9999px', fontSize: '0.85rem' }}
              >
                {formatHuman(key)}
                <button
                  onClick={() => handleRemove(key)}
                  title="Restore as working day"
                  style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', display: 'flex', padding: 0 }}
                >
                  <X size={15} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Syllabus management (monitor + admin) ──────────────────────
function SyllabusManager({ currentUser }) {
  const [sections, setSections] = useState(null); // null = loading
  const [completedList, setCompletedList] = useState([]);
  const [sectionId, setSectionId] = useState(null);
  const [subjectId, setSubjectId] = useState(null);
  const [openChapter, setOpenChapter] = useState(null);
  const [newTopic, setNewTopic] = useState({}); // { [chapterId]: text }
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notifyMsg, setNotifyMsg] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getSyllabus(), getCompletedTopics()])
      .then(([secs, completed]) => {
        if (!active) return;
        setSections(secs);
        setCompletedList(completed);
      })
      .catch((err) => { console.error(err); if (active) setSections([]); });
    return () => { active = false; };
  }, [reloadKey]);

  const completedSet = new Set(completedList);
  const emptyChecked = new Set();

  async function handleToggle(topicId) {
    // Optimistic update.
    setCompletedList((prev) => {
      const set = new Set(prev);
      set.has(topicId) ? set.delete(topicId) : set.add(topicId);
      return Array.from(set);
    });
    try {
      await toggleCompletedTopic(topicId, completedList);
    } catch (err) {
      console.error(err);
      alert('Failed to update: ' + err.message);
      setReloadKey((k) => k + 1); // resync on error
    }
  }

  async function handleChapterBulk(chapter, markDone) {
    const ids = chapterTopics(chapter).map((t) => t.topicId);
    setCompletedList((prev) => {
      const set = new Set(prev);
      ids.forEach((id) => (markDone ? set.add(id) : set.delete(id)));
      return Array.from(set);
    });
    try {
      await setCompletedBulk(ids, markDone, completedList);
    } catch (err) {
      console.error(err);
      alert('Failed to update chapter: ' + err.message);
      setReloadKey((k) => k + 1);
    }
  }

  async function handleAddTopic(chapterId) {
    const text = (newTopic[chapterId] || '').trim();
    if (!text) return;
    setBusy(true);
    try {
      await addTopicToChapter(chapterId, text);
      setNewTopic((prev) => ({ ...prev, [chapterId]: '' }));
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTopic(chapterId, topicId, topicName) {
    if (!window.confirm(`Delete topic "${topicName}"?`)) return;
    setBusy(true);
    try {
      if (topicId.includes('-x')) {
        await deleteTopicFromChapter(chapterId, topicId);
      } else {
        await hideBaseTopic(topicId);
      }
      setReloadKey((k) => k + 1);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  const activeSection = sections?.find((s) => s.sectionId === sectionId) || null;
  const activeSubject = activeSection?.subjects.find((s) => s.subjectId === subjectId) || null;

  return (
    <div className="glass-card" style={{ marginBottom: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
        <BookMarked size={20} /> Syllabus Progress
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1rem' }}>
        Mark topics as completed for the whole class. Students can only check off topics you've marked complete. You can also add new topics to any chapter.
      </p>

      {currentUser && (currentUser.isAdmin || currentUser.role === ROLES.ADMIN) && (
        <div style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            className="auth-btn secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
            onClick={async () => {
              if (!window.confirm('Notify the whole class that the syllabus was updated?')) return;
              setNotifyMsg('Sending…');
              try {
                const res = await notifyClass(currentUser, {
                  title: '✅ Syllabus Updated',
                  body: 'New progress has been marked. Check what to revise.',
                  url: '/syllabus',
                  type: 'syllabus',
                });
                setNotifyMsg(`✓ Sent to ${res.sent} device${res.sent === 1 ? '' : 's'}.`);
              } catch (err) {
                setNotifyMsg('Failed: ' + err.message);
              }
            }}
          >
            <Send size={15} /> Notify class of update
          </button>
          {notifyMsg && <span style={{ marginLeft: '0.6rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{notifyMsg}</span>}
        </div>
      )}

      {sections === null ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : (
        <>
          {/* Breadcrumb */}
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

          {/* Level 1: sections */}
          {!activeSection && sections.map((section) => {
            const stats = statsForTopics(
              section.subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics)),
              completedSet, emptyChecked
            );
            return (
              <button key={section.sectionId} className="syllabus-row" onClick={() => setSectionId(section.sectionId)}>
                <div className="syllabus-row-head">
                  <h3 className="syllabus-row-title">{section.sectionName}</h3>
                  <ChevronRight size={18} className="syllabus-row-chevron" />
                </div>
                <SyllabusProgressBar completed={stats.completedPct} checked={0} sublabel={`${stats.completed}/${stats.total} done`} size="sm" />
              </button>
            );
          })}

          {/* Level 2: subjects */}
          {activeSection && !activeSubject && activeSection.subjects.map((subject) => {
            const stats = statsForTopics(subject.chapters.flatMap((c) => c.topics), completedSet, emptyChecked);
            return (
              <button key={subject.subjectId} className="syllabus-row" onClick={() => setSubjectId(subject.subjectId)}>
                <div className="syllabus-row-head">
                  <h3 className="syllabus-row-title">{subject.subjectName}</h3>
                  <ChevronRight size={18} className="syllabus-row-chevron" />
                </div>
                <SyllabusProgressBar completed={stats.completedPct} checked={0} sublabel={`${stats.completed}/${stats.total} done`} size="sm" />
              </button>
            );
          })}

          {/* Level 3: chapters + topic toggles */}
          {activeSubject && activeSubject.chapters.map((chapter) => {
            const stats = statsForTopics(chapterTopics(chapter), completedSet, emptyChecked);
            const isOpen = openChapter === chapter.chapterId;
            const allDone = stats.total > 0 && stats.completed === stats.total;
            return (
              <div key={chapter.chapterId} className="syllabus-row" style={{ cursor: 'default' }}>
                <button
                  onClick={() => setOpenChapter(isOpen ? null : chapter.chapterId)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
                >
                  <div className="syllabus-row-head">
                    <h3 className="syllabus-row-title">{chapter.chapterName}</h3>
                    <ChevronRight size={18} className="syllabus-row-chevron" style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>
                  <SyllabusProgressBar completed={stats.completedPct} checked={0} sublabel={`${stats.completed}/${stats.total} done`} size="sm" />
                </button>

                {isOpen && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                      <button
                        className="auth-btn secondary"
                        style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
                        onClick={() => handleChapterBulk(chapter, !allDone)}
                      >
                        {allDone ? 'Unmark all' : 'Mark all complete'}
                      </button>
                    </div>

                    {chapter.topics.map((topic) => {
                      const done = completedSet.has(topic.topicId);
                      return (
                        <div key={topic.topicId} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            className={`syllabus-admin-topic ${done ? 'done' : ''}`}
                            onClick={() => handleToggle(topic.topicId)}
                            style={{ flex: 1, textAlign: 'left', cursor: 'pointer' }}
                          >
                            <span className={`syllabus-topic-box ${done ? 'checked' : ''}`} style={done ? { background: '#10b981', borderColor: '#10b981' } : undefined}>
                              {done && <Check size={13} color="#fff" strokeWidth={3} />}
                            </span>
                            <span className="syllabus-topic-name">{topic.topicName}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTopic(chapter.chapterId, topic.topicId, topic.topicName)}
                            disabled={busy}
                            title="Delete this topic"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', flexShrink: 0 }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })}

                    {/* Add topic */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                      <input
                        type="text"
                        placeholder="Add a new topic to this chapter…"
                        value={newTopic[chapter.chapterId] || ''}
                        onChange={(e) => setNewTopic((prev) => ({ ...prev, [chapter.chapterId]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTopic(chapter.chapterId); } }}
                        style={{ flex: 1, padding: '0.5rem 0.7rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
                      />
                      <button
                        type="button"
                        className="auth-btn primary"
                        disabled={busy}
                        onClick={() => handleAddTopic(chapter.chapterId)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.8rem' }}
                      >
                        <Plus size={15} /> Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── Classwork section (monitor + admin) ────────────────────────
function ClassworkManager({ currentUser }) {
  const [date, setDate] = useState('');
  const [rows, setRows] = useState([]); // [{ period, subject, note }]
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  // When the date changes, build rows from the routine and merge any
  // already-saved notes for that day.
  async function loadDate(dateKey) {
    setStatus('');
    if (!dateKey) { setRows([]); return; }
    const periods = await getPeriodsForDate(dateKey);
    if (periods.length === 0) {
      setRows([]);
      setStatus('No periods scheduled (Sunday / holiday).');
      return;
    }
    setLoading(true);
    try {
      const existing = await getClasswork(dateKey);
      const noteByPeriod = {};
      if (existing?.periods) {
        existing.periods.forEach((p) => { noteByPeriod[p.period] = p.note; });
      }
      setRows(periods.map((p) => ({ ...p, note: noteByPeriod[p.period] || '' })));
    } catch (err) {
      console.error(err);
      setRows(periods.map((p) => ({ ...p, note: '' })));
    } finally {
      setLoading(false);
    }
  }

  function handleDateChange(e) {
    const v = e.target.value;
    setDate(v);
    loadDate(v);
  }

  function updateNote(idx, note) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, note } : r)));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!date || rows.length === 0) return;
    const filled = rows.filter((r) => r.note.trim()).length;
    if (filled === 0) {
      setStatus('Add at least one period note before saving.');
      return;
    }
    if (!window.confirm(`Save classwork for ${weekdayName(date)}, ${date}? (${filled} period${filled === 1 ? '' : 's'} filled)`)) return;
    setSaving(true);
    setStatus('');
    try {
      await setClasswork(date, rows, currentUser, currentUser?.phone === TEST_PHONE);
      // Fire-and-forget push (admin only; safe no-op for monitors).
      notifyClassSafe(currentUser, {
        title: '📝 Classwork Updated',
        body: `What was done on ${weekdayName(date)} has been posted.`,
        url: '/homework?tab=classwork',
        type: 'classwork',
      });
      setStatus('✓ Classwork saved.');
    } catch (err) {
      console.error(err);
      setStatus('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass-card" style={{ marginBottom: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
        <ClipboardList size={20} /> Record Classwork
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
        Pick a day — periods are filled in automatically from the routine. Note what was actually done in each period.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Date</label>
        <input
          type="date"
          value={date}
          onChange={handleDateChange}
          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
        />
        {date && <p style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{weekdayName(date)}</p>}
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : rows.length > 0 ? (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rows.map((row, idx) => (
            <div key={row.period} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', minWidth: 28 }}>{row.period}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.subject}</span>
              </div>
              <textarea
                placeholder={`What was done in ${row.subject}?`}
                value={row.note}
                onChange={(e) => updateNote(idx, e.target.value)}
                rows={2}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
              />
            </div>
          ))}
          <button type="submit" disabled={saving} className="auth-btn primary" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <Save size={16} /> {saving ? 'Saving…' : 'Save Classwork'}
          </button>
        </form>
      ) : null}

      {status && <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: status.startsWith('✓') ? '#6ee7b7' : 'var(--text-secondary)' }}>{status}</p>}
    </div>
  );
}

// ── Broadcast (manual push, admin only) ────────────────────────
function BroadcastManager({ currentUser }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { ok, sent, failed } | { error }

  async function handleSend(e) {
    e.preventDefault();
    if (!title.trim()) return;
    if (!window.confirm(`Send this notification to all registered devices?\n\n"${title.trim()}"`)) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await notifyClass(currentUser, {
        title: title.trim(),
        body: body.trim(),
        url: '/',
        type: 'broadcast',
      });
      setResult(res);
      setTitle('');
      setBody('');
    } catch (err) {
      console.error(err);
      setResult({ error: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-card" style={{ marginBottom: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
        <Send size={20} /> Send Push Notification
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
        Sends an instant push to every student who enabled notifications — even if the app is closed.
      </p>

      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input
          type="text"
          placeholder="Notification title (e.g. Test tomorrow!)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={80}
          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
        />
        <textarea
          placeholder="Message body (optional)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={300}
          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
        />
        <button type="submit" disabled={busy} className="auth-btn primary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
          <Send size={16} /> {busy ? 'Sending…' : 'Send to Everyone'}
        </button>
      </form>

      {result && (
        result.error ? (
          <p className="auth-err" style={{ marginTop: '0.75rem' }}>Failed: {result.error}</p>
        ) : (
          <p style={{ marginTop: '0.75rem', color: '#6ee7b7', fontSize: '0.88rem' }}>
            ✓ Sent to {result.sent} device{result.sent === 1 ? '' : 's'}
            {result.failed > 0 ? ` · ${result.failed} failed` : ''}
            {result.pruned > 0 ? ` · ${result.pruned} stale removed` : ''}
            {result.sent === 0 && !result.failed ? ' (no devices registered yet)' : ''}
          </p>
        )
      )}
    </div>
  );
}


// ── Profile Completion Tracker ─────────────────────────────────
function ProfileCompletionTracker() {
  const [users, setUsers] = useState(null);
  const [tokens, setTokens] = useState(new Set()); // phones with FCM tokens
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [allUsers, tokenSnap] = await Promise.all([
        getAllUsers(),
        getDocs(collection(db, 'fcmTokens')),
      ]);
      // Build set of phones that have at least one FCM token
      const phoneSet = new Set(tokenSnap.docs.map(d => d.data().phone).filter(Boolean));
      setTokens(phoneSet);
      // Filter out teachers, merged accounts, outsiders
      const students = allUsers
        .filter(u => !u.mergedInto && u.rollNo !== undefined && u.rollNo !== 0)
        .sort((a, b) => (a.rollNo || 999) - (b.rollNo || 999));
      setUsers(students);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function getCompletion(user) {
    // Photo: can't check (localStorage only) — show as N/A
    const hasEmail = !!(user.email && user.emailVerified);
    const hasNotif = tokens.has(user.phone);
    // Install: can't track server-side
    const steps = [hasEmail, hasNotif];
    const done = steps.filter(Boolean).length;
    return { hasEmail, hasNotif, done, total: steps.length, pct: Math.round((done / steps.length) * 100) };
  }

  const sorted = users ? [...users].sort((a, b) => {
    const ca = getCompletion(a); const cb = getCompletion(b);
    return cb.pct - ca.pct;
  }) : [];

  return (
    <div className="glass-card" style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>
          <Users size={18} /> Profile Completion Tracker
        </h2>
        <button
          onClick={load}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.6rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Tracks verifiable server-side steps only: recovery email verified + notifications enabled. Photo and install can't be tracked (browser-local).
      </p>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Mail size={12} /> Email verified
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Bell size={12} /> Notifications enabled
            </span>
          </div>

          {sorted.map(user => {
            const { hasEmail, hasNotif, pct } = getCompletion(user);
            const color = pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
            return (
              <div key={user.phone} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.55rem 0.75rem',
                background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}>
                {/* Roll + Name */}
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 24, textAlign: 'right' }}>{user.rollNo}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.name}
                </span>

                {/* Status dots */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span title={hasEmail ? 'Email verified' : 'No email'} style={{ fontSize: '0.75rem' }}>
                    {hasEmail ? '✅' : '❌'}
                  </span>
                  <span title={hasNotif ? 'Notifications on' : 'Notifications off'} style={{ fontSize: '0.75rem' }}>
                    {hasNotif ? '🔔' : '🔕'}
                  </span>
                </div>

                {/* % badge */}
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700, color, minWidth: 36, textAlign: 'right',
                }}>
                  {pct}%
                </span>

                {/* Mini progress bar */}
                <div style={{ width: 48, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ── CTA Banner Manager (admin-only) ────────────────────────────
function CTABannerManager() {
  const [config, setConfig]   = useState({ enabled: false, message: '', buttonText: '', buttonUrl: '' });
  const [clicks, setClicks]   = useState(null);   // null = not loaded yet
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [loadingClicks, setLoadingClicks] = useState(false);
  const [showClicks, setShowClicks]       = useState(false);

  useEffect(() => {
    getCTABannerConfig()
      .then((cfg) => { if (cfg) setConfig(cfg); })
      .catch(console.error);
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setSaved(false);
    try {
      await saveCTABannerConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function loadClicks() {
    setLoadingClicks(true);
    try {
      const data = await getCTAClicks();
      setClicks(data);
      setShowClicks(true);
    } catch (err) {
      alert('Failed to load clicks: ' + err.message);
    } finally {
      setLoadingClicks(false);
    }
  }

  function relTime(ms) {
    if (!ms) return '';
    const diff = Date.now() - ms;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
    return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  const inputStyle = {
    width: '100%', padding: '0.7rem 0.85rem', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--surface)',
    color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box',
  };

  return (
    <div className="glass-card" style={{ marginBottom: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
        <MousePointerClick size={20} /> CTA Banner
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
        Shows a configurable announcement banner at the top of every page. Track who clicked the button.
      </p>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Enable toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
            style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: config.enabled ? '#10b981' : 'var(--text-muted)' }}>
            {config.enabled ? '🟢 Banner is ON' : '⚫ Banner is OFF'}
          </span>
        </label>

        {/* Message */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Banner Message</label>
          <input
            style={inputStyle}
            type="text"
            placeholder="e.g. PT meeting on Monday at 10am!"
            value={config.message}
            onChange={(e) => setConfig((c) => ({ ...c, message: e.target.value }))}
            maxLength={200}
          />
        </div>

        {/* Button text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Button Text</label>
          <input
            style={inputStyle}
            type="text"
            placeholder="e.g. OK  /  View Details  /  Register"
            value={config.buttonText}
            onChange={(e) => setConfig((c) => ({ ...c, buttonText: e.target.value }))}
            maxLength={40}
          />
        </div>

        {/* Button URL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <LinkIcon size={13} /> Button Link <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(leave empty to stay on page)</span>
          </label>
          <input
            style={inputStyle}
            type="text"
            placeholder="e.g. /notices  or  https://forms.gle/..."
            value={config.buttonUrl}
            onChange={(e) => setConfig((c) => ({ ...c, buttonUrl: e.target.value }))}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="auth-btn primary"
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
        >
          <Save size={16} /> {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Banner Config'}
        </button>
      </form>

      {/* Click tracker */}
      <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <MousePointerClick size={15} />
            Who clicked the button{clicks ? ` (${clicks.length})` : ''}
          </span>
          <button
            onClick={loadClicks}
            disabled={loadingClicks}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.6rem', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}
          >
            <RefreshCw size={13} style={{ animation: loadingClicks ? 'spin 1s linear infinite' : 'none' }} />
            {loadingClicks ? 'Loading…' : clicks === null ? 'Load' : 'Refresh'}
          </button>
        </div>

        {showClicks && clicks !== null && (
          clicks.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No one has clicked yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {clicks.map((c) => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 22, textAlign: 'right' }}>{c.rollNo}</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>{relTime(c.clickedAt)}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ClassConfigManager() {
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getClassConfig().then(setConfig);
  }, []);

  if (!config) return null;

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    await updateClassConfig(config);
    setBusy(false);
    alert('Class settings saved successfully!');
  }

  function handleNameChange(rollNo, name) {
    setConfig(prev => ({
      ...prev,
      studentNames: { ...prev.studentNames, [rollNo]: name }
    }));
  }

  function handleRoutineChange(day, periodIndex, subject) {
    setConfig(prev => {
      const newRoutine = { ...prev.routine };
      const newDayArr = [...(newRoutine[day] || ['', '', '', '', '', ''])];
      newDayArr[periodIndex] = subject;
      newRoutine[day] = newDayArr;
      return { ...prev, routine: newRoutine };
    });
  }

  return (
    <div className="glass-card" style={{ marginBottom: '2rem' }}>
      <div className="admin-section-header" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
        <h3><Users size={18} /> Class Configuration</h3>
        <span>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <form onSubmit={handleSave} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Class Teacher</label>
            <input className="auth-input" value={config.classTeacher} onChange={e => setConfig({...config, classTeacher: e.target.value})} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Total Students</label>
            <input className="auth-input" type="number" value={config.totalStudents} onChange={e => setConfig({...config, totalStudents: parseInt(e.target.value, 10)})} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Class Monitors (Comma separated Roll Nos)</label>
            <input className="auth-input" value={config.monitors.join(', ')} onChange={e => {
              const vals = e.target.value.split(',').map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v));
              setConfig({...config, monitors: vals});
            }} />
          </div>

          <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Weekly Routine</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3, 4, 5, 6].map(day => {
              const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day];
              return (
                <div key={day} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{dayName}</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
                    {(config.routine?.[day] || ['', '', '', '', '', '']).map((subj, idx) => (
                      <input
                        key={idx}
                        className="auth-input"
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                        placeholder={`Period ${idx + 1}`}
                        value={subj}
                        onChange={e => handleRoutineChange(day, idx, e.target.value)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Student Names (Max 40)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
            {Array.from({ length: 40 }).map((_, i) => {
              const r = i + 1;
              return (
                <div key={r} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ width: '2rem', textAlign: 'right' }}>{r}.</span>
                  <input className="auth-input" style={{ flex: 1, padding: '0.2rem 0.5rem' }} value={config.studentNames[r] || ''} onChange={e => handleNameChange(r, e.target.value)} />
                </div>
              );
            })}
          </div>
          
          <button type="submit" className="auth-btn primary" disabled={busy}>
            {busy ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function AdminPanel() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!canAccess(currentUser)) navigate('/');
  }, [currentUser, loading, navigate]);

  if (!canAccess(currentUser)) return null;

  const roleLabel = 'Monitor Panel';

  return (
    <div className="animate-fade-in fade-in-up" style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <ShieldAlert size={32} className="text-primary" />
        <h1 className="page-title text-gradient" style={{ margin: 0 }}>{roleLabel}</h1>
      </div>

      <NoticesManager currentUser={currentUser} />
      {isAdminUser(currentUser) && <BroadcastManager currentUser={currentUser} />}
      {isAdminUser(currentUser) && <CTABannerManager />}
      {isAdminUser(currentUser) && <ClassConfigManager />}
      <HomeworkManager currentUser={currentUser} />
      <ClassworkManager currentUser={currentUser} />
      <SyllabusManager currentUser={currentUser} />
      {isAdminUser(currentUser) && <CalendarOverrideManager />}
      {isAdminUser(currentUser) && <ProfileCompletionTracker />}

      {/* Records shortcut */}
      <div className="glass-card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1rem', fontWeight: 600 }}>
          <ClipboardList size={18} style={{ color: 'var(--primary)' }} /> Records
        </div>
        <button className="auth-btn primary" style={{ padding: '0.4rem 1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          onClick={() => navigate('/records-monitor')}>
          Open Records <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
