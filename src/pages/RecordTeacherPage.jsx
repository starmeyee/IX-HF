import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Lock, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roles';
import { rollList } from '../auth/rollList';
import { getTables, getEntries, setCellValue } from '../services/recordsService';

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
    const filled = rollList.filter(s => {
      const v = entries[s.rollNo]?.[col.id];
      return v !== undefined && v !== '' && v !== null;
    }).length;
    return { label: col.label, value: `${filled}/${total}`, pct: total ? filled / total : 0, type: 'text' };
  });

  if (compact) {
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

// ── Inline editable cell ──────────────────────────────────────
function EditCell({ type, value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(String(value ?? ''));
  const inputRef = useRef();

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (type === 'check') {
    return (
      <button
        className={`rec-check-cell ${value ? 'checked' : ''}`}
        onClick={() => onChange(!value)}
        title={value ? 'Uncheck' : 'Check'}
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
        onBlur={() => {
          setEditing(false);
          onChange(type === 'number' ? Number(draft) : draft);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') e.target.blur();
          if (e.key === 'Escape') { setEditing(false); setDraft(String(value ?? '')); }
        }}
      />
    );
  }

  return (
    <span className="rec-view-cell" onClick={() => { setDraft(String(value ?? '')); setEditing(true); }}>
      {value !== undefined && value !== '' && value !== null
        ? String(value)
        : <span className="rec-muted">—</span>}
    </span>
  );
}

// ── Single table section ──────────────────────────────────────
function TableSection({ table }) {
  const [entries, setEntries] = useState({});
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

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

  async function handleChange(rollNo, colId, val) {
    setEntries(prev => ({ ...prev, [rollNo]: { ...(prev[rollNo] || {}), [colId]: val } }));
    try { await setCellValue(table.id, rollNo, colId, val); }
    catch (err) { alert('Could not save: ' + (err?.message || err)); }
  }

  const filteredList = rollList.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || String(s.rollNo).includes(search)
  );

  return (
    <div className="rec-section-card rtp-card">
      {/* Header */}
      <button className="rec-section-header" onClick={() => setOpen(v => !v)}>
        <div className="rec-section-title">
          {table.title}
          {table.sensitive && (
            <span className="rec-sensitive-badge"><Lock size={11} /> Sensitive</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {/* Analytics chips shown in header when collapsed and data loaded */}
          {!open && !loading && (
            <AnalyticsCard table={table} entries={entries} compact />
          )}
          {table.description && (
            <span className="rec-section-desc">{table.description}</span>
          )}
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {open && (
        <>
          {/* Analytics full card */}
          {!loading && <AnalyticsCard table={table} entries={entries} />}

          {/* Search bar */}
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

          {loading ? (
            <p className="rec-muted" style={{ padding: '1.25rem' }}>Loading…</p>
          ) : (
            /* Mobile: card-per-student  |  Desktop: full table */
            <>
              {/* ── Desktop table (≥640px) ── */}
              <div className="rtp-table-view rec-table-wrap">
                <table className="rec-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>Roll</th>
                      <th>Name</th>
                      {table.columns.map(c => <th key={c.id}>{c.label}</th>)}
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

              {/* ── Mobile cards (< 640px) ── */}
              <div className="rtp-mobile-view">
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
          )}
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function RecordTeacherPage() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables] = useState(null);

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== ROLES.TEACHER)) navigate('/');
  }, [currentUser, loading, navigate]);

  useEffect(() => {
    if (!currentUser?.recordTables?.length) { setTables([]); return; }
    getTables()
      .then(all => setTables(all.filter(t => (currentUser.recordTables || []).includes(t.id))))
      .catch(() => setTables([]));
  }, [currentUser]);

  if (!currentUser || currentUser.role !== ROLES.TEACHER) return null;

  return (
    <div className="rec-page rtp-page animate-fade-in fade-in-up">
      <div className="rec-page-header">
        <div className="rec-page-title">
          <ClipboardList size={26} />
          <h1>Records</h1>
        </div>
      </div>

      {tables === null ? (
        <p className="rec-muted">Loading…</p>
      ) : tables.length === 0 ? (
        <div className="rec-empty">
          <ClipboardList size={44} />
          <p>No record tables assigned to you yet.</p>
          <p style={{ fontSize: '0.82rem' }}>Ask the admin to grant you access via Admin Services → Teachers.</p>
        </div>
      ) : (
        <div className="rec-sections">
          {tables.map(t => <TableSection key={t.id} table={t} />)}
        </div>
      )}
    </div>
  );
}
