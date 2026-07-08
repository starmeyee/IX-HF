import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useStarBatchRouteGuard } from '../auth/starBatchAccess';
import { ROLES } from '../auth/roles';
import { rollList } from '../auth/rollList';
import { getTables, getEntries, setCellValue, updateTable, getRecordRequests, deleteRecordRequest } from '../services/recordsService';
import { ClipboardList, Lock, ChevronDown, ChevronUp, Pencil, Check, X, Search, Bell, Trash2 } from 'lucide-react';

// ── Analytics card: shows column stats derived from entries ──────
function AnalyticsCard({ table, entries, compact = false }) {
  const total = rollList.length;

  const stats = table.columns.map(col => {
    if (col.type === 'check') {
      const checked = rollList.filter(s => entries[s.rollNo]?.[col.id] === true).length;
      return { label: col.label, value: `${checked}/${total}`, pct: total ? checked / total : 0, type: 'check' };
    }
    if (col.type === 'number') {
      const vals = rollList.map(s => entries[s.rollNo]?.[col.id]).filter(v => v !== undefined && v !== '' && v !== null);
      const filled = vals.length;
      const avg = filled ? (vals.reduce((a, b) => a + Number(b), 0) / filled).toFixed(1) : '—';
      return { label: col.label, value: `${filled}/${total}`, sub: filled ? `avg ${avg}` : null, pct: total ? filled / total : 0, type: 'number' };
    }
    // text
    const filled = rollList.filter(s => {
      const v = entries[s.rollNo]?.[col.id];
      return v !== undefined && v !== '' && v !== null;
    }).length;
    return { label: col.label, value: `${filled}/${total}`, pct: total ? filled / total : 0, type: 'text' };
  });

  if (compact) {
    // Inline chips shown in the collapsed header
    return (
      <div className="rec-analytics-chips">
        {stats.map(s => (
          <span
            key={s.label}
            className={`rec-analytics-chip ${s.type === 'check' ? (s.pct === 1 ? 'chip-full' : s.pct >= 0.5 ? 'chip-half' : 'chip-low') : 'chip-neutral'}`}
            title={s.label}
          >
            <span className="chip-label">{s.label}</span>
            <span className="chip-value">{s.value}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="rec-analytics-card">
      {stats.map(s => (
        <div key={s.label} className="rec-analytics-stat">
          <div className="rec-stat-label">{s.label}</div>
          <div className={`rec-stat-value ${s.type === 'check' ? (s.pct === 1 ? 'stat-full' : s.pct >= 0.5 ? 'stat-half' : 'stat-low') : ''}`}>
            {s.value}
          </div>
          {s.sub && <div className="rec-stat-sub">{s.sub}</div>}
          <div className="rec-stat-bar">
            <div className="rec-stat-bar-fill" style={{ width: `${Math.round(s.pct * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Inline editable cell ───────────────────────────────────────
function EditCell({ type, value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(String(value ?? ''));
  const inputRef = useRef();

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (type === 'check') {
    return (
      <button
        className={`rec-check-cell ${value ? 'checked' : ''}`}
        onClick={() => onChange(!value)}
        title={value ? 'Mark as unchecked' : 'Mark as checked'}
      >
        {value ? '✓' : '—'}
      </button>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="rec-edit-input"
        type={type === 'number' ? 'number' : 'text'}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); onChange(type === 'number' ? Number(draft) : draft); }}
        onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setEditing(false); setDraft(String(value ?? '')); } }}
      />
    );
  }

  return (
    <span className="rec-view-cell" onClick={() => { setDraft(String(value ?? '')); setEditing(true); }}>
      {value !== undefined && value !== '' && value !== null ? String(value) : <span className="rec-muted">—</span>}
    </span>
  );
}

// ── One table section ──────────────────────────────────────────
function TableSection({ table, onRenamed }) {
  const [entries, setEntries] = useState({});   // { rollNo: { values } }
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  // Rename state
  const [editing, setEditing]   = useState(false);
  const [titleDraft, setTitle]  = useState(table.title);
  const [colDrafts, setColD]    = useState(table.columns.map(c => c.label));
  const [savingMeta, setSaving] = useState(false);

  useEffect(() => {
    getEntries(table.id)
      .then(rows => {
        const map = {};
        rows.forEach(r => { map[r.rollNo] = r.values || {}; });
        setEntries(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [table.id]);

  async function handleChange(rollNo, colId, value) {
    setEntries(prev => ({
      ...prev,
      [rollNo]: { ...(prev[rollNo] || {}), [colId]: value },
    }));
    try {
      await setCellValue(table.id, rollNo, colId, value);
    } catch (err) {
      console.error('Failed to save record cell:', err);
      alert('Could not save this change: ' + (err?.message || err));
    }
  }

  function startEdit(e) {
    e.stopPropagation();
    setTitle(table.title);
    setColD(table.columns.map(c => c.label));
    setEditing(true);
    setOpen(true);
  }

  async function saveMeta() {
    if (!titleDraft.trim()) { alert('Title cannot be empty.'); return; }
    setSaving(true);
    try {
      const columns = table.columns.map((c, i) => ({ ...c, label: (colDrafts[i] || c.label).trim() }));
      await updateTable(table.id, { title: titleDraft.trim(), columns });
      setEditing(false);
      onRenamed?.();
    } catch (err) {
      alert('Could not save: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  }

  const filteredList = rollList.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || String(s.rollNo).includes(search)
  );

  return (
    <div className="rec-section-card rtp-card">
      <div className="rec-section-header" style={{ cursor: editing ? 'default' : 'pointer', flexWrap: 'wrap' }}>
        <div className="rec-section-title">
          {editing ? (
            <input
              className="rec-input"
              value={titleDraft}
              onChange={e => setTitle(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="Table name"
              style={{ maxWidth: '100%', minWidth: 200 }}
            />
          ) : (
            <button className="rec-section-titlebtn" onClick={() => setOpen(v => !v)}>
              {table.title}
              {table.sensitive && <span className="rec-sensitive-badge"><Lock size={11} /> Sensitive</span>}
            </button>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {!editing && !open && !loading && (
            <AnalyticsCard table={table} entries={entries} compact />
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {editing ? (
              <>
                <button className="rec-icon-btn" onClick={saveMeta} disabled={savingMeta} title="Save"><Check size={16} /></button>
                <button className="rec-icon-btn danger" onClick={() => setEditing(false)} title="Cancel"><X size={16} /></button>
              </>
            ) : (
              <>
                <button className="rec-icon-btn" onClick={startEdit} title="Rename table & columns"><Pencil size={15} /></button>
                <button className="rec-icon-btn" onClick={() => setOpen(v => !v)} title={open ? 'Collapse' : 'Expand'}>
                  {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {open && (
        loading ? <p className="rec-muted" style={{ padding: '1rem' }}>Loading…</p> : (
          <>
            <AnalyticsCard table={table} entries={entries} />
            
            <div className="rtp-search-row">
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                className="rtp-search-input"
                placeholder="Filter by name or roll…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 0.2rem' }}
                >
                  ×
                </button>
              )}
            </div>

            <div className="rtp-table-view rec-table-wrap">
              <table className="rec-table">
                <thead>
                  <tr>
                    <th>Roll</th>
                    <th>Name</th>
                    {table.columns.map((c, i) => (
                      <th key={c.id}>
                        {editing ? (
                          <input
                            className="rec-edit-input"
                            style={{ width: '100%', minWidth: 80 }}
                            value={colDrafts[i] ?? ''}
                            onChange={e => setColD(d => d.map((v, idx) => idx === i ? e.target.value : v))}
                          />
                        ) : c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map(student => (
                    <tr key={student.rollNo}>
                      <td className="rec-td-roll">{student.rollNo}</td>
                      <td className="rec-td-name">{student.name}</td>
                      {table.columns.map(col => (
                        <td key={col.id}>
                          <EditCell
                            type={col.type}
                            value={entries[student.rollNo]?.[col.id]}
                            onChange={val => handleChange(student.rollNo, col.id, val)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rtp-mobile-view">
              {editing && (
                 <div className="rtp-student-card" style={{ background: 'var(--surface-hover)', borderColor: 'var(--primary)', marginBottom: '1rem' }}>
                    <div className="rtp-student-header">
                      <span className="rtp-student-name">Edit Columns</span>
                    </div>
                    <div className="rtp-fields">
                      {table.columns.map((c, i) => (
                        <div key={c.id} className="rtp-field-row">
                          <span className="rtp-field-label">Column {i + 1}</span>
                          <input
                            className="rec-edit-input"
                            style={{ flex: 1 }}
                            value={colDrafts[i] ?? ''}
                            onChange={e => setColD(d => d.map((v, idx) => idx === i ? e.target.value : v))}
                          />
                        </div>
                      ))}
                    </div>
                 </div>
              )}
              {filteredList.map(student => (
                <div key={student.rollNo} className="rtp-student-card">
                  <div className="rtp-student-header">
                    <span className="rtp-roll-badge">{student.rollNo}</span>
                    <span className="rtp-student-name">{student.name}</span>
                  </div>
                  <div className="rtp-fields">
                    {table.columns.map(col => (
                      <div key={col.id} className="rtp-field-row">
                        <span className="rtp-field-label">{col.label}</span>
                        <EditCell
                          type={col.type}
                          value={entries[student.rollNo]?.[col.id]}
                          onChange={val => handleChange(student.rollNo, col.id, val)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}

export default function RecordMonitorPage() {
  useStarBatchRouteGuard();
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState(null);
  const [activeTab, setActiveTab] = useState('records'); // 'records' | 'requests'
  const [requests, setRequests] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    if (!loading && currentUser && currentUser.role !== ROLES.MONITOR && currentUser.role !== ROLES.ADMIN) navigate('/');
  }, [currentUser, navigate, loading]);

  function reload() {
    getTables().then(setTables).catch(console.error);
  }

  function loadRequests() {
    setLoadingReqs(true);
    getRecordRequests()
      .then(setRequests)
      .catch(console.error)
      .finally(() => setLoadingReqs(false));
  }

  useEffect(() => { reload(); loadRequests(); }, []);

  async function handleApproveRequest(req, newValue) {
    if (!window.confirm(`Update ${req.colName} for ${req.studentName} to "${newValue}" and approve request?`)) return;
    try {
      await setCellValue(req.tableId, req.rollNo, req.colId, newValue);
      await deleteRecordRequest(req.id);
      
      // Notify student
      const { addStudentNotification } = await import('../services/notificationHistoryService');
      await addStudentNotification({
        rollNo: req.rollNo,
        title: '✅ Record Update Approved',
        body: `Your request for ${req.tableName} (${req.colName}) has been approved and updated to "${newValue}".`,
        type: 'notice'
      });

      setRequests(prev => prev.filter(r => r.id !== req.id));
      reload();
      alert('Request approved and record updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to approve request.');
    }
  }

  async function handleDeleteRequest(req) {
    if (!window.confirm(`Delete request from ${req.studentName} without updating?`)) return;
    try {
      await deleteRecordRequest(req.id);
      setRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete request.');
    }
  }

  if (!currentUser) return null;

  return (
    <div className="rec-page">
      <div className="rec-page-header" style={{ marginBottom: '1rem' }}>
        <div className="rec-page-title">
          <ClipboardList size={26} />
          <h1>Records — Monitor</h1>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
        <button 
          onClick={() => setActiveTab('records')}
          style={{ background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer', color: activeTab === 'records' ? 'var(--primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'records' ? '2px solid var(--primary)' : '2px solid transparent', fontWeight: activeTab === 'records' ? 600 : 400, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <ClipboardList size={18} /> Records
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          style={{ background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer', color: activeTab === 'requests' ? 'var(--primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'requests' ? '2px solid var(--primary)' : '2px solid transparent', fontWeight: activeTab === 'requests' ? 600 : 400, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Bell size={18} /> Requests {requests.length > 0 && <span style={{ background: 'var(--primary)', color: '#000', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>{requests.length}</span>}
        </button>
      </div>

      {activeTab === 'records' && (
        tables === null ? (
          <p className="rec-muted">Loading…</p>
        ) : tables.length === 0 ? (
          <div className="rec-empty">
            <ClipboardList size={40} />
            <p>No record tables created yet. Ask the admin to create one.</p>
          </div>
        ) : (
          <div className="rec-sections">
            {tables.map(t => <TableSection key={t.id} table={t} onRenamed={reload} />)}
          </div>
        )
      )}

      {activeTab === 'requests' && (
        <div className="rec-sections">
          {loadingReqs ? (
            <p className="rec-muted">Loading requests...</p>
          ) : requests.length === 0 ? (
            <div className="rec-empty">
              <Check size={40} />
              <p>No pending record requests.</p>
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="rec-section-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{req.studentName} <span className="rec-muted">({req.rollNo})</span></h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Table: <strong>{req.tableName}</strong> • Column: <strong>{req.colName}</strong>
                    </div>
                  </div>
                  <button className="icon-btn danger" onClick={() => handleDeleteRequest(req)} title="Delete Request"><Trash2 size={16} /></button>
                </div>
                
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {req.message}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {tables?.find(t => t.id === req.tableId)?.columns.find(c => c.id === req.colId)?.type === 'check' ? (
                    <button className="auth-btn primary" onClick={() => handleApproveRequest(req, true)} style={{ padding: '0.5rem 1rem' }}>
                      Approve & Mark as Checked
                    </button>
                  ) : (
                    <form style={{ display: 'flex', gap: '0.5rem', width: '100%' }} onSubmit={(e) => {
                      e.preventDefault();
                      handleApproveRequest(req, e.target.elements.val.value);
                    }}>
                      <input name="val" className="rec-input" style={{ flex: 1 }} placeholder="Enter new value..." required />
                      <button type="submit" className="auth-btn primary" style={{ padding: '0.5rem 1rem' }}>Approve</button>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
