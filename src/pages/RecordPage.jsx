import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getTables, getMyEntries, addRecordRequest } from '../services/recordsService';
import { ClipboardList, AlertCircle, X, Send, ChevronDown, CheckCircle2 } from 'lucide-react';

function ValueDisplay({ type, value }) {
  if (value === undefined || value === null || value === '') return <span className="rec-muted">—</span>;
  if (type === 'check') return <span className={`rec-check-display ${value ? 'yes' : 'no'}`}>{value ? '✓ Yes' : '✗ No'}</span>;
  return <span>{String(value)}</span>;
}

function ComplaintModal({ tables, currentUser, onClose, onSuccess }) {
  const [selectedTable, setSelectedTable] = useState('');
  const [selectedCol, setSelectedCol] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeTable = tables?.find(t => t.id === selectedTable);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedTable || !selectedCol || !message.trim()) return;
    setSubmitting(true);
    try {
      const col = activeTable.columns.find(c => c.id === selectedCol);
      await addRecordRequest({
        tableId: activeTable.id,
        tableName: activeTable.title,
        colId: col.id,
        colName: col.label,
        rollNo: currentUser.rollNo,
        studentName: currentUser.name,
        message: message.trim()
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="complaint-overlay" onClick={onClose}>
      <div className="complaint-modal" onClick={e => e.stopPropagation()}>

        {/* Glow accent */}
        <div className="complaint-glow" />

        {/* Header */}
        <div className="complaint-modal-header">
          <div className="complaint-modal-icon">
            <AlertCircle size={22} />
          </div>
          <div>
            <h2 className="complaint-modal-title">Request Record Change</h2>
            <p className="complaint-modal-subtitle">Tell the monitor what needs to be corrected</p>
          </div>
          <button className="complaint-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="complaint-success">
            <div className="complaint-success-icon">
              <CheckCircle2 size={48} strokeWidth={1.5} />
            </div>
            <h3>Request Submitted!</h3>
            <p>The monitor will review your complaint and update your record.</p>
          </div>
        ) : (
          <form className="complaint-form" onSubmit={handleSubmit}>
            {/* Table select */}
            <div className="complaint-field">
              <label className="complaint-label">Which table?</label>
              <div className="complaint-select-wrap">
                <select
                  className="complaint-select"
                  value={selectedTable}
                  onChange={e => { setSelectedTable(e.target.value); setSelectedCol(''); }}
                  required
                >
                  <option value="">Select a table…</option>
                  {tables?.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="complaint-select-icon" />
              </div>
            </div>

            {/* Column select — revealed after table chosen */}
            <div className={`complaint-field complaint-field-animated ${selectedTable ? 'visible' : ''}`}>
              <label className="complaint-label">Which column?</label>
              <div className="complaint-select-wrap">
                <select
                  className="complaint-select"
                  value={selectedCol}
                  onChange={e => setSelectedCol(e.target.value)}
                  required={!!selectedTable}
                  disabled={!selectedTable}
                >
                  <option value="">Select a column…</option>
                  {activeTable?.columns.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="complaint-select-icon" />
              </div>
            </div>

            {/* Message */}
            <div className="complaint-field">
              <label className="complaint-label">Describe the issue</label>
              <textarea
                className="complaint-textarea"
                placeholder="e.g. I submitted my holiday homework but it's still showing ✗ No…"
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={`complaint-submit-btn ${submitting ? 'loading' : ''}`}
              disabled={submitting || !selectedTable || !selectedCol || !message.trim()}
            >
              {submitting ? (
                <>
                  <span className="complaint-spinner" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Request
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function RecordPage() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables]   = useState(null);
  const [entries, setEntries] = useState({});
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!loading && !currentUser) navigate('/');
  }, [currentUser, loading, navigate]);

  useEffect(() => {
    if (!currentUser?.rollNo) return;
    Promise.all([
      getTables(),
      getMyEntries(currentUser.rollNo),
    ]).then(([tbls, myEntries]) => {
      const map = {};
      myEntries.forEach(e => { map[e.tableId] = e.values || {}; });
      setTables(tbls.filter(t => !t.sensitive));
      setEntries(map);
    }).catch(console.error);
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <div className="rec-page">
      <div className="rec-page-header rec-page-header--split">
        <div className="rec-page-title">
          <ClipboardList size={26} />
          <h1>My Records</h1>
        </div>
        <button className="complaint-trigger-btn" onClick={() => setShowModal(true)}>
          <AlertCircle size={15} />
          File Complaint
        </button>
      </div>
      <p className="rec-page-sub">Your class records, filled by monitors.</p>

      {tables === null ? (
        <p className="rec-muted">Loading…</p>
      ) : tables.length === 0 ? (
        <div className="rec-empty">
          <ClipboardList size={40} />
          <p>No records available right now.</p>
        </div>
      ) : (
        <div className="rec-student-grid">
          {tables.map(table => {
            const vals = entries[table.id] || {};
            const hasData = table.columns?.some(c => vals[c.id] !== undefined && vals[c.id] !== '');
            return (
              <div key={table.id} className="rec-student-card">
                <div className="rec-student-card-header">
                  <h3 className="rec-student-card-title">{table.title}</h3>
                  {table.description && <p className="rec-student-card-desc">{table.description}</p>}
                </div>
                {!hasData ? (
                  <p className="rec-muted rec-not-filled">Not filled yet</p>
                ) : (
                  <div className="rec-student-fields">
                    {table.columns?.map(col => (
                      <div key={col.id} className="rec-student-field">
                        <span className="rec-field-label">{col.label}</span>
                        <span className="rec-field-value">
                          <ValueDisplay type={col.type} value={vals[col.id]} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ComplaintModal
          tables={tables}
          currentUser={currentUser}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
