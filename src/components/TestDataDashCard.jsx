import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTestData } from '../services/testDataService';
import { ArrowRight, Beaker, Calculator, BookOpen, Clock, CalendarDays } from 'lucide-react';

function formatDateShort(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function TestDataDashCard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getTestData()
      .then(d => { if (active) setData(d); })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (loading || !data || !data.visible) return null;

  const from = formatDateShort(data.dateFrom);
  const to   = formatDateShort(data.dateTo);
  const dateRange = from && to ? `${from} – ${to}` : from || null;

  return (
    <div
      className="test-dash-card glass-card glow-hover"
      onClick={() => navigate('/test-data')}
      style={{ cursor: 'pointer' }}
    >
      {/* Ambient glow */}
      <div className="test-dash-glow" />

      <div className="test-dash-top">
        <div className="test-dash-icon-wrap">
          <Beaker size={18} />
        </div>
        <div className="test-dash-meta">
          {dateRange && (
            <span className="test-dash-date-chip">
              <CalendarDays size={11} /> {dateRange}
            </span>
          )}
          {data.period && (
            <span className="test-dash-period-chip">
              <Clock size={11} /> {data.period}
            </span>
          )}
        </div>
      </div>

      <h3 className="test-dash-title">{data.testName}</h3>
      {data.description && (
        <p className="test-dash-desc">{data.description}</p>
      )}

      <div className="test-dash-footer">
        <div className="test-dash-sections">
          {(data.sections || []).slice(0, 4).map(sec => (
            <span key={sec.id} className="test-dash-sec-chip">{sec.name}</span>
          ))}
          {(data.sections || []).length > 4 && (
            <span className="test-dash-sec-chip test-dash-sec-more">
              +{data.sections.length - 4} more
            </span>
          )}
        </div>
        <span className="auth-link" style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
          View details <ArrowRight size={13} />
        </span>
      </div>
    </div>
  );
}
