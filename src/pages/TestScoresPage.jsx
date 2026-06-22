import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { MATH_MARKS_RAW, MAX_MARKS } from '../data/mathMarks';
import { getOverrides, fileComplaint, getMyComplaint } from '../services/marksService';
import { AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown, Minus, Trophy, Users, BarChart2 } from 'lucide-react';

// Apply overrides to a raw value
function resolve(overrides, roll, test) {
  const ov = overrides[roll];
  if (ov && ov[test] !== undefined) return ov[test];
  const val = MATH_MARKS_RAW.find(r => r.roll === roll)?.[test];
  return (val === 'Ab' || val === undefined) ? null : val;
}

// Compute class stats for one test key
function classStats(overrides, testKey) {
  const scores = MATH_MARKS_RAW
    .map(r => resolve(overrides, r.roll, testKey))
    .filter(v => v !== null);
  if (!scores.length) return null;
  return {
    avg: (scores.reduce((a, b) => a + b, 0) / scores.length),
    highest: Math.max(...scores),
    lowest: Math.min(...scores),
    count: scores.length,
  };
}

// Rank: 1-indexed, among students who took the test (lower score = higher rank number)
function getRank(overrides, roll, testKey) {
  const myScore = resolve(overrides, roll, testKey);
  if (myScore === null) return null;
  const scores = MATH_MARKS_RAW
    .map(r => resolve(overrides, r.roll, testKey))
    .filter(v => v !== null);
  const rank = scores.filter(s => s > myScore).length + 1;
  return { rank, total: scores.length };
}

function scoreColor(v) {
  if (v === null) return '#6b7280';
  if (v >= 8) return '#10b981';
  if (v >= 5) return '#f59e0b';
  return '#ef4444';
}

// ── Score Card ─────────────────────────────────────────────────
function ScoreCard({ label, value, stats, rank }) {
  const color = scoreColor(value);
  const pct = value === null ? 0 : (value / MAX_MARKS) * 100;
  const avgPct = stats ? (stats.avg / MAX_MARKS) * 100 : 0;

  return (
    <div className="ts-score-card">
      <div className="ts-score-card-header">
        <span className="ts-score-label">{label}</span>
        <span className="ts-score-value" style={{ color }}>
          {value === null ? 'Absent' : `${value} / ${MAX_MARKS}`}
        </span>
      </div>

      {/* Progress bar with avg marker */}
      <div className="ts-score-track" style={{ position: 'relative', marginTop: '0.5rem' }}>
        <div className="ts-score-fill" style={{ width: `${pct}%`, background: color }} />
        {stats && (
          <div className="ts-avg-marker" style={{ left: `${avgPct}%` }} title={`Class avg: ${stats.avg.toFixed(1)}`} />
        )}
      </div>
      <div className="ts-track-labels">
        <span>0</span>
        {stats && <span className="ts-avg-label">avg {stats.avg.toFixed(1)}</span>}
        <span>{MAX_MARKS}</span>
      </div>

      {/* Rank */}
      {rank && (
        <div className="ts-rank-row">
          <Trophy size={13} />
          Rank <strong>{rank.rank}</strong> of {rank.total} students
        </div>
      )}
    </div>
  );
}

// ── Stat Pills ─────────────────────────────────────────────────
function StatPill({ label, value, color }) {
  return (
    <div className="ts-stat-pill">
      <span className="ts-stat-label">{label}</span>
      <span className="ts-stat-val" style={{ color: color || 'var(--primary)' }}>{value}</span>
    </div>
  );
}

export default function TestScoresPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [overrides, setOverrides] = useState({});
  const [myComplaints, setMyComplaints] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ test: 'test1', claimedMarks: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!currentUser) { navigate('/'); return; }
    getOverrides().then(setOverrides).catch(() => {});
    getMyComplaint(currentUser.phone).then(setMyComplaints).catch(() => {});
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const roll = currentUser.rollNo;
  const raw = MATH_MARKS_RAW.find(r => r.roll === roll);

  if (!raw || roll === 0) {
    return (
      <div className="profile-page">
        <div className="profile-card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No marks data available for your account.</p>
        </div>
      </div>
    );
  }

  const t1 = resolve(overrides, roll, 'test1');
  const t2 = resolve(overrides, roll, 'test2');
  const stats1 = classStats(overrides, 'test1');
  const stats2 = classStats(overrides, 'test2');
  const rank1 = getRank(overrides, roll, 'test1');
  const rank2 = getRank(overrides, roll, 'test2');

  const validScores = [t1, t2].filter(v => v !== null);
  const myAvg = validScores.length ? (validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;
  const improvement = (t1 !== null && t2 !== null) ? t2 - t1 : null;

  const pendingComplaint = myComplaints.find(c => c.status === 'pending');

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    const claimed = Number(form.claimedMarks);
    if (isNaN(claimed) || claimed < 0 || claimed > MAX_MARKS) {
      setErr(`Marks must be between 0 and ${MAX_MARKS}.`);
      return;
    }
    setSubmitting(true);
    try {
      await fileComplaint({
        phone: currentUser.phone, rollNo: roll, name: currentUser.name,
        test: form.test, claimedMarks: claimed,
        currentMarks: form.test === 'test1' ? t1 : t2,
        reason: form.reason,
      });
      setMyComplaints(await getMyComplaint(currentUser.phone));
      setShowForm(false);
      setForm({ test: 'test1', claimedMarks: '', reason: '' });
    } catch (e) { setErr(e.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        {/* Header */}
        <h2 className="page-title text-gradient" style={{ marginBottom: '0.2rem' }}>Maths Test Scores</h2>
        <p className="as-muted" style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
          Roll {roll} · {currentUser.name}
        </p>

        {/* Score cards */}
        <div className="ts-cards-grid">
          <ScoreCard label="Test 1" value={t1} stats={stats1} rank={rank1} />
          <ScoreCard label="Test 2" value={t2} stats={stats2} rank={rank2} />
        </div>

        {/* My average */}
        {myAvg !== null && (
          <div className="ts-my-avg">
            <span>Your average</span>
            <strong style={{ color: scoreColor(myAvg) }}>{myAvg.toFixed(1)} / {MAX_MARKS}</strong>
          </div>
        )}

        {/* Improvement */}
        {improvement !== null && (
          <div className="ts-improvement" style={{ marginBottom: '1.5rem' }}>
            {improvement > 0
              ? <><TrendingUp size={14} color="#10b981" /><span style={{ color: '#10b981' }}>Improved by {improvement} marks (Test 1 → Test 2)</span></>
              : improvement < 0
              ? <><TrendingDown size={14} color="#ef4444" /><span style={{ color: '#ef4444' }}>Dropped by {Math.abs(improvement)} marks (Test 1 → Test 2)</span></>
              : <><Minus size={14} /><span style={{ color: 'var(--text-muted)' }}>Same score in both tests</span></>
            }
          </div>
        )}

        {/* Class Analytics */}
        <div className="ts-section-title">
          <BarChart2 size={14} /> Class Analytics
        </div>
        <div className="ts-analytics-grid">
          {stats1 && <>
            <StatPill label="Test 1 — Class Avg" value={stats1.avg.toFixed(1)} />
            <StatPill label="Test 1 — Highest" value={stats1.highest} color="#10b981" />
            <StatPill label="Test 1 — Lowest" value={stats1.lowest} color="#ef4444" />
            <StatPill label="Test 1 — Present" value={`${stats1.count} / ${MATH_MARKS_RAW.length}`} color="var(--text-secondary)" />
          </>}
          {stats2 && <>
            <StatPill label="Test 2 — Class Avg" value={stats2.avg.toFixed(1)} />
            <StatPill label="Test 2 — Highest" value={stats2.highest} color="#10b981" />
            <StatPill label="Test 2 — Lowest" value={stats2.lowest} color="#ef4444" />
            <StatPill label="Test 2 — Present" value={`${stats2.count} / ${MATH_MARKS_RAW.length}`} color="var(--text-secondary)" />
          </>}
        </div>

        {/* Improvement vs class avg comparison */}
        {(t1 !== null || t2 !== null) && (stats1 || stats2) && (
          <>
            <div className="ts-section-title" style={{ marginTop: '1.25rem' }}>
              <Users size={14} /> You vs Class Average
            </div>
            <div className="ts-compare-grid">
              {[['Test 1', t1, stats1], ['Test 2', t2, stats2]].map(([lbl, myVal, st]) => {
                if (!st) return null;
                const myPct = myVal === null ? 0 : (myVal / MAX_MARKS) * 100;
                const avgPct = (st.avg / MAX_MARKS) * 100;
                return (
                  <div key={lbl} className="ts-compare-row">
                    <span className="ts-compare-label">{lbl}</span>
                    <div className="ts-compare-bars">
                      <div className="ts-compare-bar-wrap">
                        <div className="ts-compare-bar you" style={{ width: `${myPct}%`, background: scoreColor(myVal) }} />
                        <span className="ts-compare-val" style={{ color: scoreColor(myVal) }}>
                          {myVal === null ? 'Absent' : myVal}
                        </span>
                      </div>
                      <div className="ts-compare-bar-wrap">
                        <div className="ts-compare-bar avg" style={{ width: `${avgPct}%` }} />
                        <span className="ts-compare-val" style={{ color: 'var(--text-muted)' }}>
                          {st.avg.toFixed(1)} avg
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Complaint status */}
        {myComplaints.length > 0 && (
          <div className="ts-complaints" style={{ marginTop: '1.5rem' }}>
            {myComplaints.map(c => (
              <div key={c.id} className={`ts-complaint-item ${c.status}`}>
                {c.status === 'pending' && <Clock size={14} />}
                {c.status === 'approved' && <CheckCircle size={14} />}
                {c.status === 'rejected' && <AlertCircle size={14} />}
                <span>
                  <strong>{c.test === 'test1' ? 'Test 1' : 'Test 2'} complaint</strong> —{' '}
                  {c.status === 'pending' ? `Pending review (claimed: ${c.claimedMarks})` : c.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Complaint form */}
        {!pendingComplaint && !showForm && (
          <button className="auth-btn secondary" style={{ width: '100%', marginTop: '1.5rem' }}
            onClick={() => setShowForm(true)}>
            <AlertCircle size={15} /> Report incorrect marks
          </button>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="ts-complaint-form">
            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Report Incorrect Marks
            </h4>
            <label className="ts-label">Which test?
              <select className="as-select" style={{ width: '100%', marginTop: '0.3rem' }}
                value={form.test} onChange={e => setForm(f => ({ ...f, test: e.target.value }))}>
                <option value="test1">Test 1 (currently: {t1 === null ? 'Absent' : t1})</option>
                <option value="test2">Test 2 (currently: {t2 === null ? 'Absent' : t2})</option>
              </select>
            </label>
            <label className="ts-label">My actual marks (0–{MAX_MARKS})
              <input className="auth-input" type="number" min="0" max={MAX_MARKS} placeholder="e.g. 8"
                value={form.claimedMarks} onChange={e => setForm(f => ({ ...f, claimedMarks: e.target.value }))} required />
            </label>
            <label className="ts-label">Reason (optional)
              <input className="auth-input" type="text" placeholder="e.g. marked absent but I was present"
                value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </label>
            {err && <p style={{ color: '#ef4444', fontSize: '0.82rem', margin: 0 }}>{err}</p>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="auth-btn" type="submit" style={{ flex: 1 }} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
              <button className="auth-btn secondary" type="button" style={{ flex: 1 }}
                onClick={() => { setShowForm(false); setErr(''); }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
