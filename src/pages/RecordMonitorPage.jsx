import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roles';
import { rollList } from '../auth/rollList';
import { getTables, getEntries, setCellValue } from '../services/recordsService';
import { ClipboardList, Lock, ChevronDown, ChevronUp } from 'lucide-react';

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
function TableSection({ table }) {
  const [entries, setEntries] = useState({});   // { rollNo: { values } }
  const [open, setOpen]       = useState(true);
  const [loading, setLoading] = useState(true);

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
    // Optimistic update
    setEntries(prev => ({
      ...prev,
      [rollNo]: { ...(prev[rollNo] || {}), [colId]: value },
    }));
    try {
      await setCellValue(table.id, rollNo, colId, value);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="rec-section-card">
      <button className="rec-section-header" onClick={() => setOpen(v => !v)}>
        <div className="rec-section-title">
          {table.title}
          {table.sensitive && <span className="rec-sensitive-badge"><Lock size={11} /> Sensitive</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {table.description && <span className="rec-section-desc">{table.description}</span>}
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        loading ? <p className="rec-muted" style={{ padding: '1rem' }}>Loading…</p> : (
          <div className="rec-table-wrap">
            <table className="rec-table">
              <thead>
                <tr>
                  <th>Roll</th>
                  <th>Name</th>
                  {table.columns.map(c => <th key={c.id}>{c.label}</th>)}
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

  useEffect(() => {
    getTables().then(setTables).catch(console.error);
  }, []);

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
          {tables.map(t => <TableSection key={t.id} table={t} />)}
        </div>
      )}
    </div>
  );
}
