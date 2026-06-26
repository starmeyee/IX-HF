import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Plus, Save, Trash2, Megaphone, Bold, Italic, List, Pencil, X, CalendarX, BookMarked, ChevronRight, Check, Send, ClipboardList, Users, Mail, MailCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import SyllabusProgressBar from '../components/SyllabusProgressBar';
import { addHomework } from '../services/homeworkService';
import { getNotices, addNotice, updateNotice, deleteNotice } from '../services/noticeService';
import { getClosedDays, addClosedDay, removeClosedDay } from '../services/calendarOverrideService';
import { getSyllabus, getCompletedTopics, setCompletedBulk, toggleCompletedTopic, addTopicToChapter, deleteTopicFromChapter, hideBaseTopic } from '../services/syllabusService';
import { getClasswork, setClasswork } from '../services/classworkService';
import { getPeriodsForDate, weekdayName } from '../data/routine';
import { notifyClass, notifyClassSafe } from '../services/notify';
import { statsForTopics, chapterTopics } from '../data/syllabusStats';
import { isWorkingDay, fromDateKey, calcAttendance } from '../data/attendanceUtils';
import { getAllUsers } from '../services/adminService';
import { ROLES } from '../auth/roles';

function canAccess(user) {
  return user && (user.isAdmin || user.role === ROLES.MONITOR || user.role === ROLES.ADMIN);
}

function isAdminUser(user) {
  return user && (user.isAdmin || user.role === ROLES.ADMIN);
}

// ── Notices section ────────────────────────────────────────────
function NoticesManager({ currentUser }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const textareaRef = useRef(null);

  // Fetch notices on mount and whenever a reload is requested. State is
  // only set inside async callbacks, never synchronously in the effect.
  useEffect(() => {
    let active = true;
    getNotices()
      .then((data) => { if (active) setNotices(data); })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  // Trigger a reload from event handlers (setState here is allowed).
  const refresh = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  // Insert markdown formatting around the current textarea selection.
  function applyFormat(type) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = body.slice(start, end);
    let inserted;

    if (type === 'bold') {
      inserted = `**${selected || 'bold text'}**`;
    } else if (type === 'italic') {
      inserted = `*${selected || 'italic text'}*`;
    } else if (type === 'bullet') {
      const lines = (selected || 'list item').split('\n');
      inserted = lines.map((l) => `- ${l}`).join('\n');
    }

    const next = body.slice(0, start) + inserted + body.slice(end);
    setBody(next);
    // Restore focus and place caret after the inserted text.
    requestAnimationFrame(() => {
      el.focus();
      try { el.setSelectionRange(start + inserted.length, start + inserted.length); } catch { /* noop */ }
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      if (editingId) {
        await updateNotice(editingId, { body });
      } else {
        await addNotice({ body, authorName: currentUser.name, authorPhone: currentUser.phone });
        // Fire-and-forget push to the class (admin only; safe no-op otherwise).
        const preview = body.trim().replace(/[#*_>`-]/g, '').replace(/\s+/g, ' ').slice(0, 120);
        notifyClassSafe(currentUser, { title: '📢 New Notice', body: preview, url: '/', type: 'notice' });
      }
      setBody('');
      setEditingId(null);
      refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to save notice: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(notice) {
    setEditingId(notice.id);
    setBody(notice.body);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setBody('');
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this notice for everyone? This cannot be undone.')) return;
    try {
      await deleteNotice(id);
      refresh();
    } catch (err) {
      console.error(err);
      alert('Failed to delete: ' + err.message);
    }
  }

  return (
    <div className="glass-card" style={{ marginBottom: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
        <Megaphone size={20} /> {editingId ? 'Edit Notice' : 'Post a Notice'}
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="fmt-toolbar">
          <button type="button" className="fmt-btn" title="Bold" onClick={() => applyFormat('bold')}><Bold size={16} /></button>
          <button type="button" className="fmt-btn" title="Italic" onClick={() => applyFormat('italic')}><Italic size={16} /></button>
          <button type="button" className="fmt-btn" title="Bullet list" onClick={() => applyFormat('bullet')}><List size={16} /></button>
        </div>

        <textarea
          ref={textareaRef}
          placeholder="Write your notice… Use the toolbar for **bold**, *italic*, or bullet lists."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          required
          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-primary)', resize: 'vertical', fontFamily: 'Inter, sans-serif' }}
        />

        {body.trim() && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem' }}>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Preview</span>
            <div className="markdown-content" style={{ marginTop: '0.5rem' }}>
              <ReactMarkdown>{body}</ReactMarkdown>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" disabled={busy} className="auth-btn primary" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <Save size={16} /> {busy ? 'Saving…' : editingId ? 'Update Notice' : 'Post Notice'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="auth-btn secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <X size={16} /> Cancel
            </button>
          )}
        </div>
      </form>

      {/* Existing notices */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          All Notices {notices.length > 0 && `(${notices.length})`}
        </h3>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : notices.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No notices posted yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notices.map((n) => (
              <div key={n.id} className="notice-item">
                <div className="markdown-content"><ReactMarkdown>{n.body}</ReactMarkdown></div>
                <div className="notice-item-meta">
                  <span>— {n.authorName}</span>
                  <span style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => startEdit(n)} title="Edit" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(n.id)} title="Delete" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={15} /></button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
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
      await addHomework(date, tasks);
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
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
    const periods = getPeriodsForDate(dateKey);
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
      await setClasswork(date, rows, currentUser);
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

// ── Users directory (admin only) ───────────────────────────────
function UsersManager() {
  const [users, setUsers] = useState(null);
  const [closedDays, setClosedDays] = useState([]);

  useEffect(() => {
    Promise.all([getAllUsers(), getClosedDays()])
      .then(([u, c]) => { setUsers(u); setClosedDays(c); })
      .catch(console.error);
  }, []);

  if (users === null) return (
    <div className="glass-card" style={{ marginBottom: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
        <Users size={20} /> All Users
      </h2>
      <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
    </div>
  );

  const sorted = [...users].filter((u) => !u.mergedInto).sort((a, b) => (a.rollNo || 999) - (b.rollNo || 999));

  return (
    <div className="glass-card" style={{ marginBottom: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: 'var(--text-primary)' }}>
        <Users size={20} /> All Users <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>({sorted.length})</span>
      </h2>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '0.4rem 0.6rem' }}>#</th>
              <th style={{ padding: '0.4rem 0.6rem' }}>Name</th>
              <th style={{ padding: '0.4rem 0.6rem' }}>Phone</th>
              <th style={{ padding: '0.4rem 0.6rem' }}>Email</th>
              <th style={{ padding: '0.4rem 0.6rem' }}>Attendance</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => {
              const att = calcAttendance(u.attendance_absentDays || [], undefined, closedDays);
              const pctColor = att.percentage >= 75 ? '#6ee7b7' : att.percentage >= 60 ? '#fbbf24' : '#f87171';
              return (
                <tr key={u.phone} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.5rem 0.6rem', color: 'var(--text-muted)' }}>{u.rollNo || '—'}</td>
                  <td style={{ padding: '0.5rem 0.6rem', color: 'var(--text-primary)', fontWeight: 500 }}>{u.name}</td>
                  <td style={{ padding: '0.5rem 0.6rem', color: 'var(--text-secondary)' }}>{u.phone}</td>
                  <td style={{ padding: '0.5rem 0.6rem' }}>
                    {u.email ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: u.emailVerified ? '#6ee7b7' : '#fbbf24' }}>
                        {u.emailVerified ? <MailCheck size={13} /> : <Mail size={13} />}
                        {u.email}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem 0.6rem', color: pctColor, fontWeight: 600 }}>
                    {att.percentage}% <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>({att.presentDays}/{att.totalDays})</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser === undefined) return;
    if (!canAccess(currentUser)) {
      navigate('/');
    }
  }, [currentUser, navigate]);

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
      {isAdminUser(currentUser) && <UsersManager />}
      <HomeworkManager currentUser={currentUser} />
      <ClassworkManager currentUser={currentUser} />
      <SyllabusManager currentUser={currentUser} />
      {isAdminUser(currentUser) && <CalendarOverrideManager />}
    </div>
  );
}
