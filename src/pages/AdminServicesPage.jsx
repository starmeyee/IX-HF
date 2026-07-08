import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStarBatchRouteGuard } from '../auth/starBatchAccess';
import { ROLES, TEST_PHONE } from '../auth/roles';
import { getUserRole } from '../auth/roles';
import { resetWhatsNew, resetTestAccount, setTestAccountRole, getUserByPhone } from '../auth/authService';
import { getAllUsers, getActivitySummary, purgeTestData, deleteUserDoc } from '../services/adminService';
import { calcAttendance } from '../data/attendanceUtils';
import { getClosedDays } from '../services/calendarOverrideService';
import { Users, Activity, Settings, Search, ShieldAlert, ShieldCheck, User, Users as UsersIcon, Clock, BarChart2, GitMerge, AlertTriangle, Check, FileText, CheckCircle, XCircle, Trash2, GraduationCap, Plus, KeyRound, BookOpen, Mail, MailCheck, FlaskConical, Download, ClipboardList, Beaker, X, Save, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Megaphone, Send, Star } from 'lucide-react';
import { fetchDuplicates, mergeProfiles } from '../services/mergeService';
import { getComplaints, updateComplaintStatus, applyOverride, deleteComplaint } from '../services/marksService';
import { getTeachers, addTeacher, updateTeacherPassword, deleteTeacher, setTeacherMarksAccess, setTeacherSyllabusSubjects } from '../services/teacherService';
import { getTestData, saveTestData } from '../services/testDataService';
import { syllabusData } from '../data/syllabusData';
import { getTables, setTeacherRecordTables } from '../services/recordsService';
import { getInAppNotices, addInAppNotice, deleteInAppNotice } from '../services/inAppNoticeService';
import UXCampaignAdmin from '../ux/admin/UXCampaignAdmin';
import { getStarBatchConfig, setStarBatchCode, addInternalStudent, removeInternalStudent } from '../services/starBatchService';

// Flat list of all subjects across all sections for the syllabus toggle UI
const ALL_SUBJECTS = syllabusData.flatMap(sec =>
  sec.subjects.map(sub => ({ subjectId: sub.subjectId, label: `${sub.subjectName} (${sec.sectionName})` }))
);
import { getPendingNotes, approveNote, rejectNote, deleteNote, getPublishedNotes } from '../services/notesService';
import { earnSparks, SPARK_UPLOAD_REWARD } from '../services/sparksService';
import { getAllClasswork } from '../services/classworkService';
import { getHomework } from '../services/homeworkService';

const TABS = [
  { id: 'users',      label: 'User Directory',  Icon: Users },
  { id: 'activity',   label: 'Activity',         Icon: Activity },
  { id: 'marks',      label: 'Marks Complaints', Icon: FileText },
  { id: 'notes',      label: 'Notes Review',     Icon: BookOpen },
  { id: 'teachers',   label: 'Teachers',         Icon: GraduationCap },
  { id: 'merge',      label: 'Merge Profiles',   Icon: GitMerge },
  { id: 'onboarding', label: 'Onboarding',       Icon: Settings },
  { id: 'test',       label: 'Test Account',     Icon: FlaskConical },
  { id: 'data',       label: 'Data Export',      Icon: Download },
  { id: 'records',    label: 'Records',           Icon: ClipboardList },
  { id: 'testdata',   label: 'Test Data',         Icon: Beaker },
  { id: 'push',       label: 'Pop-up Notifications', Icon: Megaphone },
  { id: 'starbatch',  label: 'Star Batch',       Icon: Star },
];

const ROLE_STYLE = {
  ADMIN:    { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    Icon: ShieldAlert },
  MONITOR:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   Icon: ShieldCheck },
  STUDENT:  { color: '#10b981', bg: 'rgba(16,185,129,0.1)',   Icon: User },
  STAR_BATCH_EXTERNAL: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', Icon: Star },
  OUTSIDER: { color: '#a8a29e', bg: 'rgba(168,162,158,0.1)',  Icon: UsersIcon },
};

function relativeTime(ms) {
  if (!ms) return '—';
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

// ── Push Notices Tab ──────────────────────────────────────────
function PushNoticesTab() {
  const [notices, setNotices] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadNotices();
  }, []);

  function loadNotices() {
    getInAppNotices().then(setNotices).catch(() => setNotices([]));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    try {
      await addInAppNotice({ title: title.trim(), body: body.trim(), buttonText: buttonText.trim(), isMandatory });
      setTitle('');
      setBody('');
      setButtonText('');
      setIsMandatory(false);
      loadNotices();
    } catch (err) {
      alert('Failed to add notice: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this push notice? It will no longer show for users who haven't seen it.")) return;
    try {
      await deleteInAppNotice(id);
      loadNotices();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="as-card">
        <h4 className="as-section-title"><Send size={15} /> Create Pop-up Notification</h4>
        <p className="as-muted" style={{ marginBottom: '1.25rem' }}>
          This will pop up on the user's screen 5 seconds after they log in. If they have multiple unseen notices, they will appear one by one.
        </p>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            className="as-input"
            placeholder="Notice Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            maxLength={60}
          />
          <textarea
            className="as-input"
            placeholder="Notice Body"
            value={body}
            onChange={e => setBody(e.target.value)}
            required
            rows={3}
            style={{ resize: 'vertical' }}
          />
          <input
            type="text"
            className="as-input"
            placeholder="Custom Button Text (Optional)"
            value={buttonText}
            onChange={e => setButtonText(e.target.value)}
            maxLength={30}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            <input 
              type="checkbox" 
              checked={isMandatory} 
              onChange={e => setIsMandatory(e.target.checked)} 
              style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
            />
            Mandatory (Users must click "I Understand" to dismiss)
          </label>
          <button type="submit" className="auth-btn primary" disabled={busy} style={{ alignSelf: 'flex-start', padding: '0.6rem 1.2rem', marginTop: '0.5rem' }}>
            {busy ? 'Adding...' : 'Add Pop-up Notification'}
          </button>
        </form>
      </div>

      <div className="as-card">
        <h4 className="as-section-title"><Megaphone size={15} /> Active Pop-up Notifications</h4>
        {notices === null ? (
          <p className="as-muted">Loading...</p>
        ) : notices.length === 0 ? (
          <p className="as-muted">No active notifications.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {notices.map(n => (
              <div key={n.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '1rem', background: 'var(--bg-card)', position: 'relative' }}>
                <button 
                  onClick={() => handleDelete(n.id)}
                  style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', width: 28, height: 28, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Delete Notice"
                >
                  <Trash2 size={14} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h5 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', paddingRight: '2rem' }}>{n.title}</h5>
                  {n.isMandatory && <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.1rem 0.4rem', borderRadius: 4, fontWeight: 600, textTransform: 'uppercase' }}>Mandatory</span>}
                </div>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{n.body}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created: {new Date(n.createdAt).toLocaleString()}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Button: <strong>{n.buttonText || (n.isMandatory ? 'I Understand' : 'Acknowledge')}</strong>
                  </div>
                </div>
                {n.acknowledgedBy && n.acknowledgedBy.length > 0 && (
                  <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <strong>Acknowledged by ({n.acknowledgedBy.length}):</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.4rem' }}>
                      {n.acknowledgedBy.map((user, idx) => (
                        <span key={idx} style={{ background: 'var(--surface-hover)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                          {user}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState(null);
  const [closedDays, setClosedDays] = useState([]);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    Promise.all([getAllUsers(), getClosedDays()])
      .then(([u, c]) => {
        // Attach a computed role (never persisted in Firestore — derived from
        // rollNo, same as AuthContext does on login) so display + filtering
        // works correctly here too.
        const withRoles = u.map(x => ({ ...x, role: getUserRole(x.rollNo) }));
        setUsers(withRoles);
        setClosedDays(c);
      })
      .catch(() => setUsers([]));
  }, []);

  // Star Batch external users (rollNo 85, or 100-199) have their own
  // dedicated section in the Star Batch tab — they are not part of the main
  // 40-student class roster and should not be mixed into this list, since
  // admin actions here (delete, roll-based lookups) assume real enrolled
  // students.
  const mainRoster = (users || []).filter(u => u.role !== ROLES.STAR_BATCH_EXTERNAL);
  const externalCount = (users || []).length - mainRoster.length;

  const filtered = mainRoster
    .filter(u => u.name?.toLowerCase().includes(query.toLowerCase()) || String(u.rollNo).includes(query))
    .sort((a, b) => (a.rollNo || 999) - (b.rollNo || 999));

  async function handleDelete(u) {
    if (!window.confirm(`Are you sure you want to permanently delete ${u.name} (Roll ${u.rollNo})?`)) return;
    setBusyId(u.id);
    try {
      await deleteUserDoc(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch (e) {
      alert("Failed to delete user: " + e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="as-search-row">
        <Search size={16} />
        <input
          className="as-search"
          placeholder="Search by name or roll no…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      {users === null ? (
        <p className="as-muted">Loading…</p>
      ) : (
        <>
          <p className="as-muted" style={{ marginBottom: '0.75rem' }}>
            {filtered.length} of {mainRoster.length} class users
            {externalCount > 0 && (
              <> · {externalCount} Star Batch external user{externalCount === 1 ? '' : 's'} (see Star Batch tab)</>
            )}
          </p>
          <div className="as-table-wrap">
            <table className="as-table">
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Email</th>
                  <th>Attendance</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const rs = ROLE_STYLE[u.role] || ROLE_STYLE.OUTSIDER;
                  const RIcon = rs.Icon;
                  const masked = u.phone?.replace(/(\d{2})\d{6}(\d{2})/, '$1XXXXXX$2') || '—';
                  return (
                    <tr key={u.id}>
                      <td>{u.rollNo || '—'}</td>
                      <td style={{ fontWeight: 500 }}>{u.name}</td>
                      <td className="as-mono">{masked}</td>
                      <td>
                        <span className="as-role-badge" style={{ color: rs.color, background: rs.bg }}>
                          <RIcon size={11} /> {u.role}
                        </span>
                      </td>
                      <td>
                        {u.email ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: u.emailVerified ? '#6ee7b7' : '#fbbf24', fontSize: '0.82rem' }}>
                            {u.emailVerified ? <MailCheck size={12} /> : <Mail size={12} />}
                            {u.email}
                          </span>
                        ) : <span className="as-muted-cell">—</span>}
                      </td>
                      <td>
                        {(() => {
                          const att = calcAttendance(u.attendance_absentDays || [], undefined, closedDays);
                          const c = att.percentage >= 75 ? '#6ee7b7' : att.percentage >= 60 ? '#fbbf24' : '#f87171';
                          return <span style={{ color: c, fontWeight: 600 }}>{att.percentage}% <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>({att.presentDays}/{att.totalDays})</span></span>;
                        })()}
                      </td>
                      <td className="as-muted-cell">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</td>
                      <td>
                        <button 
                          onClick={() => handleDelete(u)} 
                          disabled={busyId === u.id}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem' }}
                          title="Delete User"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Activity Tab ──────────────────────────────────────────────
function ActivityTab() {
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [sort, setSort] = useState('lastSeen'); // lastSeen | totalVisits

  useEffect(() => {
    Promise.all([getActivitySummary(), getAllUsers()]).then(([act, usr]) => {
      setSummary(act);
      setUsers(usr);
    }).catch(() => setSummary([]));
  }, []);

  if (summary === null) return <p className="as-muted">Loading…</p>;

  // Merge activity with user names
  const userMap = Object.fromEntries(users.map(u => [u.phone, u]));

  const rows = summary.map(a => {
    const totalVisits = Object.values(a.events || {}).reduce((s, v) => s + v, 0);
    const topPage = Object.entries(a.events || {}).sort((x, y) => y[1] - x[1])[0];
    return { ...a, totalVisits, topPage: topPage?.[0] || '—', user: userMap[a.phone] };
  });

  const sorted = [...rows].sort((a, b) =>
    sort === 'lastSeen' ? (b.lastSeen || 0) - (a.lastSeen || 0) : b.totalVisits - a.totalVisits
  );

  // Aggregate page usage across all users
  const pageAgg = {};
  summary.forEach(a => {
    Object.entries(a.events || {}).forEach(([page, cnt]) => {
      pageAgg[page] = (pageAgg[page] || 0) + cnt;
    });
  });
  const topPages = Object.entries(pageAgg).sort((a, b) => b[1] - a[1]);
  const maxCount = topPages[0]?.[1] || 1;

  return (
    <div>
      {/* Page popularity */}
      <h4 className="as-section-title"><BarChart2 size={15} /> Page Popularity</h4>
      <div className="as-bar-list">
        {topPages.map(([page, cnt]) => (
          <div key={page} className="as-bar-row">
            <span className="as-bar-label">{page}</span>
            <div className="as-bar-track">
              <div className="as-bar-fill" style={{ width: `${(cnt / maxCount) * 100}%` }} />
            </div>
            <span className="as-bar-count">{cnt}</span>
          </div>
        ))}
      </div>

      {/* Per-user table */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', margin: '1.5rem 0 0.75rem' }}>
        <h4 className="as-section-title" style={{ margin: 0 }}><Users size={15} /> Per-User Activity</h4>
        <select className="as-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="lastSeen">Sort: Last Active</option>
          <option value="totalVisits">Sort: Most Active</option>
        </select>
      </div>
      <div className="as-table-wrap">
        <table className="as-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Last Active</th>
              <th>Total Visits</th>
              <th>Top Page</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.phone}>
                <td style={{ fontWeight: 500 }}>{row.user?.name || row.phone}</td>
                <td className="as-muted-cell"><Clock size={12} style={{ marginRight: 4 }} />{relativeTime(row.lastSeen)}</td>
                <td style={{ textAlign: 'center' }}>{row.totalVisits}</td>
                <td className="as-muted-cell">{row.topPage}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={4} className="as-muted" style={{ textAlign: 'center', padding: '1.5rem' }}>No activity data yet. Users will appear here once they browse.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Onboarding Tab ────────────────────────────────────────────
function OnboardingTab() {
  return <UXCampaignAdmin />;
}


// ── Marks Complaints Tab ──────────────────────────────────────
function MarksTab() {
  const [complaints, setComplaints] = useState(null);
  const [busy, setBusy] = useState(null); // id being processed

  useEffect(() => {
    getComplaints().then(setComplaints).catch(() => setComplaints([]));
  }, []);

  async function handleApprove(c) {
    setBusy(c.id);
    try {
      await applyOverride(c.rollNo, c.test, c.claimedMarks);
      await updateComplaintStatus(c.id, 'approved');
      setComplaints(prev => prev.map(x => x.id === c.id ? { ...x, status: 'approved' } : x));
    } catch (e) { alert(e.message); }
    finally { setBusy(null); }
  }

  async function handleReject(c) {
    setBusy(c.id);
    try {
      await updateComplaintStatus(c.id, 'rejected');
      setComplaints(prev => prev.map(x => x.id === c.id ? { ...x, status: 'rejected' } : x));
    } catch (e) { alert(e.message); }
    finally { setBusy(null); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this complaint?')) return;
    setBusy(id);
    try {
      await deleteComplaint(id);
      setComplaints(prev => prev.filter(x => x.id !== id));
    } catch (e) { alert(e.message); }
    finally { setBusy(null); }
  }

  const pending = (complaints || []).filter(c => c.status === 'pending');
  const resolved = (complaints || []).filter(c => c.status !== 'pending');

  const STATUS_COLOR = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444' };

  function ComplaintRow({ c }) {
    const isPending = c.status === 'pending';
    return (
      <div className="marks-complaint-row">
        <div className="marks-complaint-info">
          <strong>{c.name}</strong> <span className="as-muted">Roll {c.rollNo}</span>
          <span style={{ color: STATUS_COLOR[c.status], fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize', marginLeft: '0.5rem' }}>
            {c.status}
          </span>
          <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {c.test === 'test1' ? 'Test 1' : 'Test 2'} · Current: <strong>{c.currentMarks ?? 'Absent'}</strong> → Claimed: <strong>{c.claimedMarks}</strong>
            {c.reason && <span> · "{c.reason}"</span>}
          </div>
        </div>
        <div className="marks-complaint-actions">
          {isPending && (
            <>
              <button className="marks-btn approve" onClick={() => handleApprove(c)} disabled={!!busy}>
                <CheckCircle size={14} /> Approve
              </button>
              <button className="marks-btn reject" onClick={() => handleReject(c)} disabled={!!busy}>
                <XCircle size={14} /> Reject
              </button>
            </>
          )}
          <button className="marks-btn delete" onClick={() => handleDelete(c.id)} disabled={!!busy}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  }

  if (complaints === null) return <p className="as-muted">Loading…</p>;

  return (
    <div>
      <h4 className="as-section-title" style={{ marginBottom: '0.75rem' }}>
        <Clock size={14} /> Pending ({pending.length})
      </h4>
      {pending.length === 0
        ? <p className="as-muted">No pending complaints.</p>
        : pending.map(c => <ComplaintRow key={c.id} c={c} />)
      }
      {resolved.length > 0 && (
        <>
          <h4 className="as-section-title" style={{ margin: '1.5rem 0 0.75rem' }}>
            <Check size={14} /> Resolved ({resolved.length})
          </h4>
          {resolved.map(c => <ComplaintRow key={c.id} c={c} />)}
        </>
      )}
    </div>
  );
}

// ── Merge Tab ─────────────────────────────────────────────────
function MergeTab() {
  const [rollNo, setRollNo] = useState('');
  const [dupes, setDupes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [status, setStatus] = useState(null); // null | 'confirm' | 'merging' | 'done' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSearch() {
    if (!rollNo) return;
    setLoading(true); setDupes(null); setStatus(null); setPrimaryPhone('');
    try {
      const found = await fetchDuplicates(rollNo);
      setDupes(found);
      if (found.length >= 2) setPrimaryPhone(found[0].phone);
    } catch(e) { setErrorMsg(e.message); setStatus('error'); }
    finally { setLoading(false); }
  }

  async function handleMerge() {
    setStatus('merging');
    try {
      const secondary = dupes.find(u => u.phone !== primaryPhone);
      await mergeProfiles(primaryPhone, secondary.phone);
      setStatus('done');
    } catch(e) { setErrorMsg(e.message); setStatus('error'); }
  }

  const secondary = dupes?.find(u => u.phone !== primaryPhone);

  function mask(phone) { return phone?.replace(/(\d{2})\d{6}(\d{2})/, '$1XXXXXX$2') || '—'; }

  return (
    <div>
      <p className="as-muted" style={{ marginBottom: '1rem' }}>
        Search by roll number to find duplicate accounts, then merge them into one profile.
        Array data (homework, attendance, syllabus) is always unioned — nothing is lost.
        The user will be prompted to set a new password on next login.
      </p>

      <div className="as-search-row" style={{ maxWidth: 320 }}>
        <Search size={16} />
        <input className="as-search" placeholder="Roll number…" value={rollNo}
          onChange={e => setRollNo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        <button className="auth-btn secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
          onClick={handleSearch} disabled={loading}>
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {dupes !== null && dupes.length < 2 && (
        <p className="as-muted" style={{ marginTop: '1rem' }}>
          {dupes.length === 0 ? 'No users found for this roll number.' : 'Only one account found — no merge needed.'}
        </p>
      )}

      {dupes?.length >= 2 && status !== 'done' && (
        <div className="merge-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#f59e0b' }}>
            <AlertTriangle size={16} /> <strong>2 accounts found for Roll {rollNo}</strong>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Choose which phone number becomes the <strong>primary</strong> (login) number.
            The other becomes the alternate — both will still work to log in.
          </p>

          <div className="merge-phone-list">
            {dupes.map(u => (
              <label key={u.phone} className={`merge-phone-option ${primaryPhone === u.phone ? 'selected' : ''}`}>
                <input type="radio" name="primary" value={u.phone}
                  checked={primaryPhone === u.phone}
                  onChange={() => setPrimaryPhone(u.phone)} />
                <div>
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div className="as-mono" style={{ fontSize: '0.82rem' }}>{mask(u.phone)}</div>
                  <div className="as-muted" style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                    Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'} ·{' '}
                    Homework: {(u.completedHomework || []).length} ·{' '}
                    Absent days: {(u.attendance_absentDays || []).length}
                  </div>
                </div>
              </label>
            ))}
          </div>

          {secondary && (
            <div className="merge-summary">
              <strong>After merge:</strong> {mask(primaryPhone)} is primary · {mask(secondary.phone)} becomes alternate ·
              Array data unioned · Password cleared (user sets new one on next login)
            </div>
          )}

          {status === 'confirm' ? (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="auth-btn" style={{ flex: 1 }} onClick={handleMerge}>
                Yes, merge permanently
              </button>
              <button className="auth-btn secondary" style={{ flex: 1 }} onClick={() => setStatus(null)}>
                Cancel
              </button>
            </div>
          ) : status === 'merging' ? (
            <p className="as-muted" style={{ marginTop: '1rem' }}>Merging…</p>
          ) : (
            <button className="auth-btn" style={{ marginTop: '1rem', width: '100%' }}
              onClick={() => setStatus('confirm')} disabled={!primaryPhone}>
              <GitMerge size={15} /> Merge Profiles
            </button>
          )}

          {status === 'error' && <p style={{ color: '#ef4444', marginTop: '0.75rem', fontSize: '0.85rem' }}>{errorMsg}</p>}
        </div>
      )}

      {status === 'done' && (
        <div className="merge-card merge-done">
          <Check size={20} color="#10b981" />
          <div>
            <strong>Merge complete.</strong>
            <p className="as-muted">
              {mask(primaryPhone)} is now the primary account.
              The user will see a banner on their dashboard and be prompted to set a new password on next login.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notes Review Tab ──────────────────────────────────────────
function NotesReviewTab() {
  const [notes,     setNotes]     = useState(null);
  const [published, setPublished] = useState(null);
  const [busy,      setBusy]      = useState(null);
  const [showPub,   setShowPub]   = useState(false);

  useEffect(() => {
    getPendingNotes().then(setNotes).catch(() => setNotes([]));
  }, []);

  useEffect(() => {
    if (!showPub || published !== null) return;
    getPublishedNotes().then(setPublished).catch(() => setPublished([]));
  }, [showPub]);

  async function handleApprove(n) {
    setBusy(n.id);
    try {
      await approveNote(n.id);
      await earnSparks(n.uploaderPhone, SPARK_UPLOAD_REWARD, `Notes approved: ${n.title}`);
      setNotes(prev => prev.filter(x => x.id !== n.id));
    } catch (e) { alert(e.message); }
    finally { setBusy(null); }
  }

  async function handleReject(n) {
    const reason = prompt(`Reason for rejecting "${n.title}" (students will see this):`);
    if (reason === null) return;
    setBusy(n.id);
    try {
      await rejectNote(n.id, reason.trim());
      setNotes(prev => prev.filter(x => x.id !== n.id));
    } catch (e) { alert(e.message); }
    finally { setBusy(null); }
  }

  async function handleDelete(id, fromPublished) {
    if (!confirm('Permanently delete this note?')) return;
    setBusy(id);
    try {
      await deleteNote(id);
      if (fromPublished) setPublished(prev => prev.filter(x => x.id !== id));
      else setNotes(prev => prev.filter(x => x.id !== id));
    } catch (e) { alert(e.message); }
    finally { setBusy(null); }
  }

  function NoteRow({ n, fromPublished }) {
    return (
      <div className="marks-complaint-row">
        <div className="marks-complaint-info">
          <strong>{n.title}</strong>
          <span className="as-muted" style={{ marginLeft: '0.5rem', fontSize: '0.82rem' }}>
            {n.subjectName} · {n.chapterName}
          </span>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            by {n.uploaderName}
            {n.description && <span> · "{n.description}"</span>}
          </div>
          <div style={{ marginTop: '0.4rem' }}>
            <a href={`https://docs.google.com/viewer?url=${encodeURIComponent(n.blobUrl)}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
              Preview PDF ↗
            </a>
          </div>
        </div>
        <div className="marks-complaint-actions">
          {!fromPublished && (
            <>
              <button className="marks-btn approve" onClick={() => handleApprove(n)} disabled={!!busy}>
                <CheckCircle size={14} /> Approve (+4✦)
              </button>
              <button className="marks-btn reject" onClick={() => handleReject(n)} disabled={!!busy}>
                <XCircle size={14} /> Reject
              </button>
            </>
          )}
          <button className="marks-btn delete" onClick={() => handleDelete(n.id, fromPublished)} disabled={!!busy}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  }

  if (notes === null) return <p className="as-muted">Loading…</p>;

  return (
    <div>
      <h4 className="as-section-title" style={{ marginBottom: '0.75rem' }}>
        <BookOpen size={14} /> Pending ({notes.length})
      </h4>
      {notes.length === 0
        ? <p className="as-muted">No pending notes to review.</p>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notes.map(n => <NoteRow key={n.id} n={n} fromPublished={false} />)}
          </div>
      }

      <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', padding: 0, fontFamily: 'inherit', fontSize: '0.88rem' }}
          onClick={() => setShowPub(o => !o)}>
          <CheckCircle size={14} color="#10b981" /> Published Notes {showPub ? '▲' : '▼'}
        </button>
        {showPub && (
          <div style={{ marginTop: '0.75rem' }}>
            {published === null
              ? <p className="as-muted">Loading…</p>
              : published.length === 0
              ? <p className="as-muted">No published notes yet.</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {published.map(n => <NoteRow key={n.id} n={n} fromPublished={true} />)}
                </div>
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ── Teachers Tab ──────────────────────────────────────────────
function TeachersTab() {
  const [teachers, setTeachers] = useState(null);
  const [busy, setBusy]         = useState(null);
  const [form, setForm]         = useState({ name: '', subject: '', period: '', password: '' });
  const [editingId, setEditingId] = useState(null); // id of teacher getting password reset
  const [newPass, setNewPass]   = useState('');
  const [showAdd, setShowAdd]   = useState(false);

  // Which teacher's syllabus panel is open
  const [syllabusExpandedId, setSyllabusExpandedId] = useState(null);
  // Which teacher's records panel is open
  const [recordsExpandedId, setRecordsExpandedId] = useState(null);
  const [allTables, setAllTables] = useState([]);

  useEffect(() => {
    getTeachers().then(setTeachers).catch(() => setTeachers([]));
    getTables().then(setAllTables).catch(() => {});
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name || !form.subject || !form.period || !form.password) return;
    setBusy('add');
    try {
      await addTeacher(form);
      const fresh = await getTeachers();
      setTeachers(fresh);
      setForm({ name: '', subject: '', period: '', password: '' });
      setShowAdd(false);
    } catch (err) { alert(err.message); }
    finally { setBusy(null); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this teacher account?')) return;
    setBusy(id);
    try {
      await deleteTeacher(id);
      setTeachers(prev => prev.filter(t => t.id !== id));
    } catch (err) { alert(err.message); }
    finally { setBusy(null); }
  }

  async function handleSetPassword(e) {
    e.preventDefault();
    if (!newPass.trim()) return;
    setBusy(editingId);
    try {
      await updateTeacherPassword(editingId, newPass);
      setEditingId(null); setNewPass('');
      alert('Password updated.');
    } catch (err) { alert(err.message); }
    finally { setBusy(null); }
  }

  async function handleToggleMarks(t) {
    setBusy(t.id);
    try {
      const next = !t.canManageMarks;
      await setTeacherMarksAccess(t.id, next);
      setTeachers(prev => prev.map(x => x.id === t.id ? { ...x, canManageMarks: next } : x));
    } catch (err) { alert(err.message); }
    finally { setBusy(null); }
  }

  async function handleToggleSyllabusSubject(t, subjectId) {
    const current = t.syllabusSubjects || [];
    const next = current.includes(subjectId)
      ? current.filter(id => id !== subjectId)
      : [...current, subjectId];
    setBusy(t.id + subjectId);
    try {
      await setTeacherSyllabusSubjects(t.id, next);
      setTeachers(prev => prev.map(x => x.id === t.id ? { ...x, syllabusSubjects: next } : x));
    } catch (err) { alert(err.message); }
    finally { setBusy(null); }
  }

  async function handleToggleRecordTable(t, tableId) {
    const current = t.recordTables || [];
    const next = current.includes(tableId)
      ? current.filter(id => id !== tableId)
      : [...current, tableId];
    setBusy(t.id + tableId);
    try {
      await setTeacherRecordTables(t.id, next);
      setTeachers(prev => prev.map(x => x.id === t.id ? { ...x, recordTables: next } : x));
    } catch (err) { alert(err.message); }
    finally { setBusy(null); }
  }

  if (teachers === null) return <p className="as-muted">Loading…</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <h4 className="as-section-title" style={{ margin: 0 }}><GraduationCap size={14} /> Teacher Accounts ({teachers.length})</h4>
        <button className="auth-btn secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.82rem', flexShrink: 0 }}
          onClick={() => setShowAdd(o => !o)}>
          <Plus size={13} /> {showAdd ? 'Cancel' : 'Add Teacher'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="marks-complaint-row" style={{ flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', padding: '1rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)' }}>New Teacher</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <input className="as-search" placeholder="Full name (e.g. R.K. Jha)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <input className="as-search" placeholder="Subject (e.g. Maths)" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
            <input className="as-search" placeholder="Period (e.g. 5th Period)" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} required />
            <input className="as-search" placeholder="Password to give teacher" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </div>
          <button className="auth-btn primary" type="submit" disabled={busy === 'add'} style={{ alignSelf: 'flex-start' }}>
            {busy === 'add' ? 'Adding…' : 'Add Teacher'}
          </button>
        </form>
      )}

      {teachers.length === 0 ? (
        <p className="as-muted">No teachers added yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {teachers.map(t => (
            <div key={t.id} className="marks-complaint-row">
              <div className="marks-complaint-info">
                <strong>{t.name}</strong>
                <span className="as-muted" style={{ marginLeft: '0.5rem', fontSize: '0.82rem' }}>{t.subject} · {t.period}</span>
                {editingId === t.id && (
                  <form onSubmit={handleSetPassword} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <input className="as-search" type="password" placeholder="New password" value={newPass}
                      onChange={e => setNewPass(e.target.value)} required style={{ minWidth: 160 }} />
                    <button className="marks-btn approve" type="submit" disabled={!!busy}>Save</button>
                    <button type="button" className="marks-btn delete" onClick={() => { setEditingId(null); setNewPass(''); }}>Cancel</button>
                  </form>
                )}
                {syllabusExpandedId === t.id && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Grant syllabus subject access:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {ALL_SUBJECTS.map(({ subjectId, label }) => {
                        const granted = (t.syllabusSubjects || []).includes(subjectId);
                        return (
                          <button
                            key={subjectId}
                            className={`marks-btn ${granted ? 'approve' : ''}`}
                            style={{ fontSize: '0.75rem', opacity: busy === t.id + subjectId ? 0.5 : 1 }}
                            onClick={() => handleToggleSyllabusSubject(t, subjectId)}
                            disabled={!!busy}
                          >
                            {granted ? <Check size={11} /> : <Plus size={11} />} {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {recordsExpandedId === t.id && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Grant record table access:</p>
                    {allTables.length === 0
                      ? <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No record tables created yet.</p>
                      : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {allTables.map(table => {
                            const granted = (t.recordTables || []).includes(table.id);
                            return (
                              <button
                                key={table.id}
                                className={`marks-btn ${granted ? 'approve' : ''}`}
                                style={{ fontSize: '0.75rem', opacity: busy === t.id + table.id ? 0.5 : 1 }}
                                onClick={() => handleToggleRecordTable(t, table.id)}
                                disabled={!!busy}
                              >
                                {granted ? <Check size={11} /> : <Plus size={11} />} {table.title}
                              </button>
                            );
                          })}
                        </div>
                    }
                  </div>
                )}
              </div>
              <div className="marks-complaint-actions">
                <button
                  className={`marks-btn ${t.canManageMarks ? 'approve' : 'delete'}`}
                  onClick={() => handleToggleMarks(t)}
                  disabled={!!busy}
                  title={t.canManageMarks ? 'Marks access ON — click to revoke' : 'Marks access OFF — click to grant'}
                >
                  <BarChart2 size={13} /> Marks: {t.canManageMarks ? 'On' : 'Off'}
                </button>
                <button
                  className={`marks-btn ${syllabusExpandedId === t.id ? 'approve' : ''}`}
                  onClick={() => setSyllabusExpandedId(id => id === t.id ? null : t.id)}
                  disabled={!!busy}
                  title="Manage syllabus subject access"
                >
                  <BookOpen size={13} /> Syllabus {(t.syllabusSubjects || []).length > 0 ? `(${t.syllabusSubjects.length})` : ''}
                </button>
                <button
                  className={`marks-btn ${recordsExpandedId === t.id ? 'approve' : ''}`}
                  onClick={() => setRecordsExpandedId(id => id === t.id ? null : t.id)}
                  disabled={!!busy}
                  title="Manage record table access"
                >
                  <ClipboardList size={13} /> Records {(t.recordTables || []).length > 0 ? `(${t.recordTables.length})` : ''}
                </button>
                <button className="marks-btn approve" onClick={() => { setEditingId(t.id); setNewPass(''); }} disabled={!!busy}>
                  <KeyRound size={13} /> Password
                </button>
                <button className="marks-btn delete" onClick={() => handleDelete(t.id)} disabled={!!busy}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Test Account Tab ──────────────────────────────────────────
function TestAccountTab() {
  const [account, setAccount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const u = await getUserByPhone(TEST_PHONE);
    setAccount(u);
  }

  useEffect(() => { load(); }, []);

  async function handleSwitchRole(role) {
    setBusy(true); setMsg('');
    try { await setTestAccountRole(role); await load(); setMsg(`✓ Switched to ${role}`); }
    catch (e) { setMsg('Failed: ' + e.message); }
    finally { setBusy(false); }
  }

  async function handleReset() {
    if (!window.confirm('Reset test account to clean state?')) return;
    setBusy(true); setMsg('');
    try { await resetTestAccount(); await load(); setMsg('✓ Account reset.'); }
    catch (e) { setMsg('Failed: ' + e.message); }
    finally { setBusy(false); }
  }

  async function handlePurge() {
    if (!window.confirm('Delete ALL test-tagged data (notes, homework, classwork)?')) return;
    setBusy(true); setMsg('');
    try { const n = await purgeTestData(); setMsg(`✓ Purged ${n} test record${n === 1 ? '' : 's'}.`); }
    catch (e) { setMsg('Failed: ' + e.message); }
    finally { setBusy(false); }
  }

  if (!account) return <p className="as-muted">Loading…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '480px' }}>
      <div className="glass-card" style={{ padding: '1rem' }}>
        <p className="as-muted" style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}>Phone: {TEST_PHONE}</p>
        <p style={{ marginBottom: '0.75rem' }}>
          Current role: <strong style={{ color: 'var(--primary)' }}>{account.activeRole || 'STUDENT'}</strong>
          {account.email && <> · Email: <span style={{ color: account.emailVerified ? '#6ee7b7' : '#fbbf24' }}>{account.email}</span></>}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {[ROLES.STUDENT, ROLES.MONITOR, ROLES.TEACHER, ROLES.ADMIN].map(role => (
            <button key={role}
              className={`auth-btn ${account.activeRole === role ? 'primary' : 'secondary'}`}
              style={{ flex: 1, minWidth: '80px', fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
              disabled={busy} onClick={() => handleSwitchRole(role)}>
              {role}
            </button>
          ))}
        </div>
        <button className="auth-btn secondary" style={{ width: '100%', marginBottom: '0.5rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
          disabled={busy} onClick={handleReset}>
          🔄 Reset Test Account
        </button>
        <button className="auth-btn secondary" style={{ width: '100%', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
          disabled={busy} onClick={handlePurge}>
          🗑 Purge All Test Data
        </button>
        {msg && <p style={{ marginTop: '0.6rem', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>{msg}</p>}
      </div>
      <p className="as-muted" style={{ fontSize: '0.78rem' }}>
        Test account phone: <strong>{TEST_PHONE}</strong>. All writes made while logged in as this account are tagged <code>isTest: true</code> in Firestore and can be purged in bulk.
      </p>
    </div>
  );
}

// ── Data Export Tab ───────────────────────────────────────────
function DataExportTab() {
  const [busy, setBusy] = useState(false);
  const [msg,  setMsg]  = useState('');

  async function handleDownload() {
    setBusy(true); setMsg('Fetching data…');
    try {
      const [homework, classwork] = await Promise.all([getHomework(), getAllClasswork()]);
      const payload = {
        exportedAt: new Date().toISOString(),
        homework,
        classwork,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `homework-classwork-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMsg(`✓ Downloaded — ${homework.length} homework, ${classwork.length} classwork entries.`);
    } catch (e) {
      setMsg('Error: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <p className="as-muted" style={{ marginBottom: '1.25rem' }}>
        Downloads a JSON file with every homework and classwork record from Firestore, sorted newest first.
      </p>
      <button
        className="auth-btn primary"
        onClick={handleDownload}
        disabled={busy}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <Download size={16} />
        {busy ? 'Fetching…' : 'Download JSON'}
      </button>
      {msg && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{msg}</p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function AdminServicesPage() {
  useStarBatchRouteGuard();
  const { currentUser, triggerTour, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('users');

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== ROLES.ADMIN)) navigate('/');
  }, [currentUser, loading, navigate]);

  if (!currentUser || currentUser.role !== ROLES.ADMIN) return null;

  return (
    <div className="as-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <ShieldAlert size={22} color="#ef4444" />
        <h1 className="page-title text-gradient" style={{ margin: 0 }}>Admin Services</h1>
      </div>

      <div className="as-tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={`as-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="as-content">
        {tab === 'users'      && <UsersTab />}
        {tab === 'activity'   && <ActivityTab />}
        {tab === 'marks'      && <MarksTab />}
        {tab === 'notes'      && <NotesReviewTab />}
        {tab === 'teachers'   && <TeachersTab />}
        {tab === 'merge'      && <MergeTab />}
        {tab === 'onboarding' && <OnboardingTab />}
        {tab === 'test'       && <TestAccountTab />}
        {tab === 'data'       && <DataExportTab />}
        {tab === 'records'    && (
          <div style={{ maxWidth: 480 }}>
            <p className="as-muted" style={{ marginBottom: '1.25rem' }}>
              Create and manage class record tables. Students see non-sensitive tables on their Records page; monitors fill them in.
            </p>
            <button
              className="auth-btn primary"
              onClick={() => navigate('/records-admin')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ClipboardList size={16} /> Open Records Admin
            </button>
          </div>
        )}
        {tab === 'testdata'   && <TestDataTab />}
        {tab === 'push'       && <PushNoticesTab />}
        {tab === 'starbatch'  && <StarBatchTab />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Test Data Tab
──────────────────────────────────────────────────────────────*/
function newSection() {
  return {
    id: `sec_${Date.now()}`,
    name: '',
    date: '',
    totalMarks: 0,
    status: 'predicted',
    subsections: [{ name: '', chapters: [''] }],
  };
}

function TestDataTab() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSec, setExpandedSec] = useState(null);
  // rawChapters: { 'sIdx_subIdx': string } — keeps the live textarea text
  // so Enter/space aren't eaten by array conversion on every keystroke.
  const [rawChapters, setRawChapters] = useState({});

  useEffect(() => {
    getTestData().then(d => {
      const initial = d || {
        visible: false,
        testName: '',
        description: '',
        dateFrom: '',
        dateTo: '',
        period: '',
        sections: [],
      };
      setConfig(initial);
      // Pre-populate rawChapters from loaded data
      const raw = {};
      (initial.sections || []).forEach((sec, sIdx) => {
        (sec.subsections || []).forEach((sub, subIdx) => {
          raw[`${sIdx}_${subIdx}`] = (sub.chapters || []).join('\n');
        });
      });
      setRawChapters(raw);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  function update(key, val) {
    setConfig(prev => ({ ...prev, [key]: val }));
  }

  function updateSection(idx, key, val) {
    setConfig(prev => {
      const sections = prev.sections.map((s, i) => i === idx ? { ...s, [key]: val } : s);
      return { ...prev, sections };
    });
  }

  function updateSubsection(sIdx, subIdx, key, val) {
    setConfig(prev => {
      const sections = prev.sections.map((s, i) => {
        if (i !== sIdx) return s;
        const subsections = s.subsections.map((sub, j) => j === subIdx ? { ...sub, [key]: val } : sub);
        return { ...s, subsections };
      });
      return { ...prev, sections };
    });
  }

  function addSubsection(sIdx) {
    setConfig(prev => {
      const sections = prev.sections.map((s, i) => {
        if (i !== sIdx) return s;
        return { ...s, subsections: [...(s.subsections || []), { name: '', chapters: [''] }] };
      });
      return { ...prev, sections };
    });
  }

  function removeSubsection(sIdx, subIdx) {
    setConfig(prev => {
      const sections = prev.sections.map((s, i) => {
        if (i !== sIdx) return s;
        return { ...s, subsections: s.subsections.filter((_, j) => j !== subIdx) };
      });
      return { ...prev, sections };
    });
  }

  function setChapters(sIdx, subIdx, raw) {
    // Just store the raw text — don't parse yet (preserves Enter/spaces while typing)
    setRawChapters(prev => ({ ...prev, [`${sIdx}_${subIdx}`]: raw }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      // Before saving, flush all raw textarea text into config chapters arrays
      const finalConfig = {
        ...config,
        sections: (config.sections || []).map((sec, sIdx) => ({
          ...sec,
          subsections: (sec.subsections || []).map((sub, subIdx) => {
            const key = `${sIdx}_${subIdx}`;
            const raw = rawChapters[key];
            return raw !== undefined
              ? { ...sub, chapters: raw.split('\n').map(c => c.trim()).filter(Boolean) }
              : sub;
          }),
        })),
      };
      await saveTestData(finalConfig);
      // Sync config state to match what was saved
      setConfig(finalConfig);
      alert('Saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="as-muted">Loading…</p>;

  return (
    <div style={{ maxWidth: 620, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Visibility toggle */}
      <div className="td-admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Show on Dashboard</h3>
            <p className="as-muted" style={{ margin: '0.2rem 0 0', fontSize: '0.82rem' }}>
              When off, the test card is hidden from all students.
            </p>
          </div>
          <button
            className={`td-toggle-btn ${config.visible ? 'on' : 'off'}`}
            onClick={() => update('visible', !config.visible)}
          >
            {config.visible ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
          </button>
        </div>
      </div>

      {/* Basic info */}
      <div className="td-admin-card">
        <h3 className="td-admin-card-title">Basic Info</h3>
        <div className="td-admin-field">
          <label className="td-admin-label">Test Name</label>
          <input className="td-admin-input" value={config.testName} onChange={e => update('testName', e.target.value)} placeholder="e.g. Unit Test 1" />
        </div>
        <div className="td-admin-field">
          <label className="td-admin-label">Short Description (shown on dashboard card)</label>
          <textarea className="td-admin-input td-admin-textarea" rows={2} value={config.description} onChange={e => update('description', e.target.value)} placeholder="e.g. First unit test covering all subjects" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="td-admin-field">
            <label className="td-admin-label">From Date</label>
            <input className="td-admin-input" type="date" value={config.dateFrom} onChange={e => update('dateFrom', e.target.value)} />
          </div>
          <div className="td-admin-field">
            <label className="td-admin-label">To Date</label>
            <input className="td-admin-input" type="date" value={config.dateTo} onChange={e => update('dateTo', e.target.value)} />
          </div>
        </div>
        <div className="td-admin-field">
          <label className="td-admin-label">Timing / Period</label>
          <input className="td-admin-input" value={config.period} onChange={e => update('period', e.target.value)} placeholder="e.g. 9:00 AM – 11:00 AM" />
        </div>
      </div>

      {/* Sections */}
      <div className="td-admin-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 className="td-admin-card-title" style={{ margin: 0 }}>Sections / Subjects</h3>
          <button
            className="auth-btn secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            onClick={() => {
              const sec = newSection();
              setConfig(prev => ({ ...prev, sections: [...(prev.sections || []), sec] }));
              setExpandedSec(sec.id);
            }}
          >
            <Plus size={14} /> Add Section
          </button>
        </div>

        {(!config.sections || config.sections.length === 0) && (
          <p className="as-muted">No sections yet. Click "Add Section" to begin.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(config.sections || []).map((sec, sIdx) => (
            <div key={sec.id} className="td-admin-section-row">
              {/* Section collapse toggle */}
              <div
                className="td-admin-section-header"
                onClick={() => setExpandedSec(expandedSec === sec.id ? null : sec.id)}
              >
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {sec.name || <em style={{ color: 'var(--text-muted)' }}>Unnamed section</em>}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>FM {sec.totalMarks || 0}</span>
                  <button
                    onClick={e => { e.stopPropagation(); setConfig(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== sIdx) })); }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}
                    title="Delete section"
                  >
                    <Trash2 size={14} />
                  </button>
                  {expandedSec === sec.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {expandedSec === sec.id && (
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="td-admin-field">
                      <label className="td-admin-label">Section Name</label>
                      <input className="td-admin-input" value={sec.name} onChange={e => updateSection(sIdx, 'name', e.target.value)} placeholder="e.g. Science" />
                    </div>
                    <div className="td-admin-field">
                      <label className="td-admin-label">Exam Date</label>
                      <input className="td-admin-input" type="date" value={sec.date} onChange={e => updateSection(sIdx, 'date', e.target.value)} />
                    </div>
                    <div className="td-admin-field">
                      <label className="td-admin-label">Full Marks (FM)</label>
                      <input className="td-admin-input" type="number" min="0" value={sec.totalMarks} onChange={e => updateSection(sIdx, 'totalMarks', Number(e.target.value))} />
                    </div>
                    <div className="td-admin-field">
                      <label className="td-admin-label">Syllabus Status</label>
                      <select className="td-admin-input" value={sec.status} onChange={e => updateSection(sIdx, 'status', e.target.value)}>
                        <option value="predicted">Predicted</option>
                        <option value="accurate">Confirmed / Accurate</option>
                      </select>
                    </div>
                  </div>

                  {/* Subsections */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <label className="td-admin-label">Subsections &amp; Chapters</label>
                      <button
                        onClick={() => addSubsection(sIdx)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        <Plus size={12} /> Add subsection
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {(sec.subsections || []).map((sub, subIdx) => (
                        <div key={subIdx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <input
                              className="td-admin-input"
                              style={{ flex: 1, marginBottom: 0 }}
                              value={sub.name}
                              onChange={e => updateSubsection(sIdx, subIdx, 'name', e.target.value)}
                              placeholder="Subsection name (e.g. Physics) — leave blank for none"
                            />
                            {(sec.subsections || []).length > 1 && (
                              <button
                                onClick={() => removeSubsection(sIdx, subIdx)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', flexShrink: 0 }}
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                          <label className="td-admin-label">Chapters (one per line)</label>
                          <textarea
                            className="td-admin-input td-admin-textarea"
                            rows={5}
                            value={rawChapters[`${sIdx}_${subIdx}`] ?? (sub.chapters || []).join('\n')}
                            onChange={e => setChapters(sIdx, subIdx, e.target.value)}
                            placeholder={'Chapter 1: Light\nChapter 2: Electricity\nChapter 3: Magnetic Effects'}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button
        className="auth-btn primary"
        onClick={handleSave}
        disabled={saving}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem' }}
      >
        <Save size={16} /> {saving ? 'Saving…' : 'Save Test Data'}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Star Batch Tab
──────────────────────────────────────────────────────────────*/
function StarBatchTab() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [rollInput, setRollInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [externals, setExternals] = useState(null);
  const [closedDays, setClosedDays] = useState([]);

  useEffect(() => {
    loadConfig();
    loadExternals();
  }, []);

  function loadConfig() {
    setLoading(true);
    getStarBatchConfig().then(c => {
      setConfig(c);
      setNewCode(c.code);
    }).finally(() => setLoading(false));
  }

  function loadExternals() {
    Promise.all([getAllUsers(), getClosedDays()]).then(([u, c]) => {
      const withRoles = u
        .map(x => ({ ...x, role: getUserRole(x.rollNo) }))
        .filter(x => x.role === ROLES.STAR_BATCH_EXTERNAL)
        .sort((a, b) => (a.rollNo || 0) - (b.rollNo || 0));
      setExternals(withRoles);
      setClosedDays(c);
    }).catch(() => setExternals([]));
  }

  async function handleSetCode() {
    if (!/^\d{4}$/.test(newCode)) return alert("Code must be exactly 4 digits (0-9 only).");
    setBusy(true);
    try {
      await setStarBatchCode(newCode);
      alert('Code updated');
      loadConfig();
    } catch(e) { alert(e.message); }
    finally { setBusy(false); }
  }

  async function handleAddStudent(e) {
    e.preventDefault();
    if (!rollInput) return;
    setBusy(true);
    try {
      await addInternalStudent(rollInput);
      setRollInput('');
    } catch(e) {
      // addInternalStudent may throw even after successfully writing to the
      // allow-list (e.g. "no matching user found yet") — always reload so
      // the UI reflects what was actually persisted, not just clean success.
      alert(e.message);
    } finally {
      loadConfig();
      loadExternals();
      setBusy(false);
    }
  }

  async function handleRemove(roll) {
    if (!window.confirm(`Remove roll ${roll} from Star Batch?`)) return;
    setBusy(true);
    try {
      await removeInternalStudent(roll);
    } catch(e) {
      alert(e.message);
    } finally {
      loadConfig();
      loadExternals();
      setBusy(false);
    }
  }

  if (loading) return <p className="as-muted">Loading...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="as-card">
        <h4 className="as-section-title"><KeyRound size={15} /> 4-Digit Access Code</h4>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <input className="as-input" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={newCode} onChange={e => setNewCode(e.target.value.replace(/\D/g, '').slice(0, 4))} style={{ width: 100 }} />
          <button className="auth-btn primary" onClick={handleSetCode} disabled={busy}>Update Code</button>
        </div>
      </div>
      
      <div className="as-card">
        <h4 className="as-section-title"><Star size={15} /> Internal Students</h4>
        <form onSubmit={handleAddStudent} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', marginBottom: '1rem' }}>
          <input className="as-input" type="number" placeholder="Roll No." value={rollInput} onChange={e => setRollInput(e.target.value)} style={{ width: 120 }} />
          <button className="auth-btn" type="submit" disabled={busy}>Add Student</button>
        </form>
        
        {config?.internalRolls?.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {config.internalRolls.map(r => (
              <span key={r} style={{ background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', padding: '0.2rem 0.5rem', borderRadius: 4, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Roll {r}
                <button onClick={() => handleRemove(r)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}><X size={12}/></button>
              </span>
            ))}
          </div>
        ) : (
          <p className="as-muted">No internal students added.</p>
        )}
      </div>

      <div className="as-card">
        <h4 className="as-section-title"><Star size={15} /> Registered External Students</h4>
        <p className="as-muted" style={{ marginTop: '0.25rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
          Students who signed up via the Star Batch portal (unique rolls 100-199, or legacy roll 85). Shown here separately from the main class roster.
        </p>
        {externals === null ? (
          <p className="as-muted">Loading...</p>
        ) : externals.length === 0 ? (
          <p className="as-muted">No external students registered yet.</p>
        ) : (
          <div className="as-table-wrap">
            <table className="as-table">
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Name</th>
                  <th>Unlocked</th>
                  <th>Attendance</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {externals.map(u => {
                  const att = calcAttendance(u.attendance_absentDays || [], undefined, closedDays);
                  const c = att.percentage >= 75 ? '#6ee7b7' : att.percentage >= 60 ? '#fbbf24' : '#f87171';
                  return (
                    <tr key={u.id}>
                      <td>{u.rollNo}</td>
                      <td style={{ fontWeight: 500 }}>{u.name}</td>
                      <td>{u.hasUnlockedStarBatch ? <span style={{ color: '#6ee7b7' }}>Yes</span> : <span style={{ color: '#f87171' }}>No</span>}</td>
                      <td>
                        <span style={{ color: c, fontWeight: 600 }}>{att.percentage}% <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>({att.presentDays}/{att.totalDays})</span></span>
                      </td>
                      <td className="as-muted-cell">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
