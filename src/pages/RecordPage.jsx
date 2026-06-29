import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getTables, getMyEntries } from '../services/recordsService';
import { ClipboardList } from 'lucide-react';

function ValueDisplay({ type, value }) {
  if (value === undefined || value === null || value === '') return <span className="rec-muted">—</span>;
  if (type === 'check') return <span className={`rec-check-display ${value ? 'yes' : 'no'}`}>{value ? '✓ Yes' : '✗ No'}</span>;
  return <span>{String(value)}</span>;
}

export default function RecordPage() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [tables, setTables]   = useState(null);
  const [entries, setEntries] = useState({});  // { tableId: { values } }

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
      <div className="rec-page-header">
        <div className="rec-page-title">
          <ClipboardList size={26} />
          <h1>My Records</h1>
        </div>
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
    </div>
  );
}
