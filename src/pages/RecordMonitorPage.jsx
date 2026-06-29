import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roles';
import { rollList } from '../auth/rollList';
import { getTables, getEntries, setCellValue, updateTable } from '../services/recordsService';
import { ClipboardList, Lock, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';

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
  const [open, setOpen]       = useState(true);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="rec-section-card">
      <div className="rec-section-header" style={{ cursor: editing ? 'default' : 'pointer' }}>
        <div className="rec-section-title" style={{ flex: 1 }}>
          {editing ? (
            <input
              className="rec-input"
              value={titleDraft}
              onChange={e => setTitle(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="Table name"
              style={{ maxWidth: 240 }}
            />
          ) : (
            <button className="rec-section-titlebtn" onClick={() => setOpen(v => !v)}>
              {table.title}
              {table.sensitive && <span className="rec-sensitive-badge"><Lock size={11} /> Sensitive</span>}
            </button>
          )}
        </div>
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

      {open && (
        loading ? <p className="rec-muted" style={{ padding: '1rem' }}>Loading…</p> : (
          <div className="rec-table-wrap">
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
                {rollList.map(student => (
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
        )
      )}
    </div>
  );
}

export default function RecordMonitorPage() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    if (!loading && currentUser && currentUser.role !== ROLES.MONITOR && currentUser.role !== ROLES.ADMIN) navigate('/');
  }, [currentUser, navigate]);

  function reload() {
    getTables().then(setTables).catch(console.error);
  }

  useEffect(() => { reload(); }, []);

  if (!currentUser) return null;

  return (
    <div className="rec-page">
      <div className="rec-page-header">
        <div className="rec-page-title">
          <ClipboardList size={26} />
          <h1>Records — Monitor</h1>
        </div>
      </div>

      {tables === null ? (
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
      )}
    </div>
  );
}
