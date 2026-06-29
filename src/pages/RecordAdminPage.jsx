import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLES } from '../auth/roles';
import { createTable, getTables, deleteTable } from '../services/recordsService';
import { ClipboardList, Plus, Trash2, X, Lock, Unlock } from 'lucide-react';

const COL_TYPES = [
  { value: 'check',  label: '✓ Check' },
  { value: 'text',   label: 'T Text' },
  { value: 'number', label: '# Number' },
];

function CreateModal({ onClose, onCreated }) {
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [sensitive, setSens]    = useState(false);
  const [cols, setCols]         = useState([{ label: '', type: 'check' }]);
  const [busy, setBusy]         = useState(false);

  function addCol() { setCols(c => [...c, { label: '', type: 'check' }]); }
  function removeCol(i) { setCols(c => c.filter((_, idx) => idx !== i)); }
  function updateCol(i, field, val) {
    setCols(c => c.map((col, idx) => idx === i ? { ...col, [field]: val } : col));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const columns = cols
      .filter(c => c.label.trim())
      .map((c, i) => ({ id: `col_${Date.now()}_${i}`, label: c.label.trim(), type: c.type }));
    if (!columns.length) return alert('Add at least one column.');
    setBusy(true);
    try {
      await createTable({ title, description: desc, sensitive, columns });
      onCreated();
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rec-modal-overlay" onClick={onClose}>
      <div className="rec-modal" onClick={e => e.stopPropagation()}>
        <div className="rec-modal-header">
          <h2><ClipboardList size={18} /> New Record Table</h2>
          <button className="rec-icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="rec-modal-body">
          <input
            className="rec-input" placeholder="Table title *" required
            value={title} onChange={e => setTitle(e.target.value)}
          />
          <textarea
            className="rec-input rec-textarea" placeholder="Description (optional)"
            value={desc} onChange={e => setDesc(e.target.value)} rows={2}
          />

          <label className="rec-toggle-row">
            <button type="button" className={`rec-toggle ${sensitive ? 'on' : ''}`} onClick={() => setSens(v => !v)}>
              {sensitive ? <Lock size={14} /> : <Unlock size={14} />}
              {sensitive ? 'Sensitive — hidden from students' : 'Visible to all students'}
            </button>
          </label>

          {/* Fixed columns */}
          <div className="rec-col-section-label">Columns</div>
          <div className="rec-fixed-cols">
            <span className="rec-fixed-chip">Roll No.</span>
            <span className="rec-fixed-chip">Name</span>
          </div>

          {/* Custom columns */}
          {cols.map((col, i) => (
            <div key={i} className="rec-col-row">
              <input
                className="rec-input rec-col-label" placeholder={`Column ${i + 1} label`}
                value={col.label} onChange={e => updateCol(i, 'label', e.target.value)}
              />
              <select
                className="rec-select" value={col.type}
                onChange={e => updateCol(i, 'type', e.target.value)}
              >
                {COL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button type="button" className="rec-icon-btn danger" onClick={() => removeCol(i)}><X size={15} /></button>
            </div>
          ))}

          <button type="button" className="rec-add-col-btn" onClick={addCol}>
            <Plus size={14} /> Add Column
          </button>

          <button type="submit" className="auth-btn primary" disabled={busy} style={{ marginTop: '0.5rem' }}>
            {busy ? 'Creating…' : 'Create Table'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RecordAdminPage() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables]     = useState(null);
  const [showModal, setModal]   = useState(false);

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== ROLES.ADMIN)) navigate('/');
  }, [currentUser, navigate]);

  async function load() {
    setTables(await getTables());
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete table "${title}"? Existing entries will be orphaned.`)) return;
    await deleteTable(id);
    load();
  }

  if (!currentUser || currentUser.role !== ROLES.ADMIN) return null;

  return (
    <div className="rec-page">
      <div className="rec-page-header">
        <div className="rec-page-title">
          <ClipboardList size={26} />
          <h1>Records — Admin</h1>
        </div>
        <button className="auth-btn primary rec-new-btn" onClick={() => setModal(true)}>
          <Plus size={15} /> New Record
        </button>
      </div>

      {tables === null ? (
        <p className="rec-muted">Loading…</p>
      ) : tables.length === 0 ? (
        <div className="rec-empty">
          <ClipboardList size={40} />
          <p>No record tables yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="rec-table-list">
          {tables.map(t => (
            <div key={t.id} className="rec-table-card">
              <div className="rec-table-card-body">
                <div className="rec-table-card-title">
                  {t.title}
                  {t.sensitive && <span className="rec-sensitive-badge"><Lock size={11} /> Sensitive</span>}
                </div>
                {t.description && <p className="rec-table-card-desc">{t.description}</p>}
                <div className="rec-table-card-meta">
                  {t.columns?.length ?? 0} custom column{t.columns?.length !== 1 ? 's' : ''}
                </div>
              </div>
              <button className="rec-icon-btn danger" onClick={() => handleDelete(t.id, t.title)} title="Delete table">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateModal
          onClose={() => setModal(false)}
          onCreated={() => { setModal(false); load(); }}
        />
      )}
    </div>
  );
}
