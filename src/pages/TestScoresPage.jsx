import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { MATH_MARKS_RAW, MAX_MARKS } from '../data/mathMarks';
import { getOverrides, fileComplaint, getMyComplaint } from '../services/marksService';
import { AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown, Minus, Trophy, Users, BarChart2, LayoutDashboard, AlertTriangle } from 'lucide-react';

function resolve(overrides, roll, test) {
  const ov = overrides[roll];
  if (ov && ov[test] !== undefined) return ov[test];
  const val = MATH_MARKS_RAW.find(r => r.roll === roll)?.[test];
  return (val === 'Ab' || val === undefined) ? null : val;
}

function classStats(overrides, testKey) {
  const scores = MATH_MARKS_RAW.map(r => resolve(overrides, r.roll, testKey)).filter(v => v !== null);
  if (!scores.length) return null;
  return {
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
    highest: Math.max(...scores),
    lowest: Math.min(...scores),
    count: scores.length,
  };
}

function getRank(overrides, roll, testKey) {
  const myScore = resolve(overrides, roll, testKey);
  if (myScore === null) return null;
  const scores = MATH_MARKS_RAW.map(r => resolve(overrides, r.roll, testKey)).filter(v => v !== null);
  return { rank: scores.filter(s => s > myScore).length + 1, total: scores.length };
}

function scoreColor(v) {
  if (v === null) return '#6b7280';
  if (v >= 8) return '#10b981';
  if (v >= 5) return '#f59e0b';
  return '#ef4444';
}

// ── Redesigned Score Card ──────────────────────────────────────
function ScoreCard({ label, value, stats, rank }) {
  const color = scoreColor(value);
  const pct = value === null ? 0 : (value / MAX_MARKS) * 100;
  const avgPct = stats ? (stats.avg / MAX_MARKS) * 100 : 0;

  return (
    <div className="ts-score-card">
      <div className="ts-score-card-top">
        <span className="ts-score-label">{label}</span>
        {rank && (
          <span className="ts-rank-chip">
            <Trophy size={11} /> #{rank.rank}
          </span>
        )}
      </div>

      <div className="ts-score-number" style={{ color }}>
        {value === null ? <span className="ts-absent-badge">Absent</span> : (
          <>
            <span className="ts-score-big">{value}</span>
            <span className="ts-score-denom">/ {MAX_MARKS}</span>
          </>
        )}
      </div>

      {/* Bar: my score vs class avg */}
      <div className="ts-bar-section">
        <div className="ts-bar-track">
          <div className="ts-bar-fill" style={{ width: `${pct}%`, background: color }} />
          {stats && <div className="ts-bar-avg-pin" style={{ left: `${avgPct}%` }} title={`Class avg ${stats.avg.toFixed(1)}`} />}
        </div>
        {stats && (
          <div className="ts-bar-meta">
            <span>0</span>
            <span className="ts-bar-avg-label">avg {stats.avg.toFixed(1)}</span>
            <span>{MAX_MARKS}</span>
          </div>
        )}
      </div>

      {rank && (
        <p className="ts-rank-sub">Rank {rank.rank} of {rank.total} students who took the test</p>
      )}
    </div>
  );
}

export default function TestScoresPage() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [overrides, setOverrides] = useState({});
  const [myComplaints, setMyComplaints] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ test: 'test1', type: 'marks', claimedMarks: '', claimedStatus: 'present', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!currentUser) { navigate('/'); return; }
    if (currentUser.role === 'TEACHER') { navigate('/maths'); return; }
    getOverrides().then(setOverrides).catch(() => {});
    getMyComplaint(currentUser.phone).then(setMyComplaints).catch(() => {});
  }, [currentUser, loading, navigate]);

  if (!currentUser) return null;

  const roll = currentUser.rollNo;
  const raw = MATH_MARKS_RAW.find(r => r.roll === roll);

  if (!raw || roll === 0) {
    return (
      <div className="ts-page">
        <div className="ts-inner" style={{ textAlign: 'center', paddingTop: '3rem', color: 'var(--text-secondary)' }}>
          No marks data available for your account.
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
  const myAvg = validScores.length ? validScores.reduce((a, b) => a + b, 0) / validScores.length : null;
  const improvement = (t1 !== null && t2 !== null) ? t2 - t1 : null;
  const pendingComplaint = myComplaints.find(c => c.status === 'pending');

  async function handleSubmit(e) {
    e.preventDefault(); setErr('');
    if (form.type === 'marks') {
      const claimed = Number(form.claimedMarks);
      if (isNaN(claimed) || claimed < 0 || claimed > MAX_MARKS) { setErr(`Marks must be 0–${MAX_MARKS}.`); return; }
      setSubmitting(true);
      try {
        await fileComplaint({ phone: currentUser.phone, rollNo: roll, name: currentUser.name, test: form.test, claimedMarks: claimed, currentMarks: form.test === 'test1' ? t1 : t2, reason: form.reason });
      } catch (e) { setErr(e.message); setSubmitting(false); return; }
    } else {
      setSubmitting(true);
      try {
        await fileComplaint({ phone: currentUser.phone, rollNo: roll, name: currentUser.name, test: form.test, claimedMarks: form.claimedStatus === 'present' ? 'PRESENT' : 'ABSENT', currentMarks: form.test === 'test1' ? (t1 === null ? 'absent' : 'present') : (t2 === null ? 'absent' : 'present'), reason: `Attendance dispute: I was ${form.claimedStatus}. ${form.reason}`, complaintType: 'attendance' });
      } catch (e) { setErr(e.message); setSubmitting(false); return; }
    }
    setMyComplaints(await getMyComplaint(currentUser.phone));
    setShowForm(false);
    setForm({ test: 'test1', type: 'marks', claimedMarks: '', claimedStatus: 'present', reason: '' });
    setSubmitting(false);
  }

  return (
    <div className="ts-page">
      <div className="ts-inner">

        {/* ── Page Header ── */}
        <div className="ts-header">
          <div>
            <h1 className="ts-page-title">Maths Test Scores</h1>
            <p className="ts-page-sub">Roll {roll} · {currentUser.name} · Weekly Tests</p>
          </div>
        </div>

        <div className="ts-body">

          {/* ══ LEFT COLUMN ══ */}
          <div className="ts-col-left">

            {/* Overall Average — Primary focus */}
            {myAvg !== null && (
              <div className="ts-avg-hero">
                <p className="ts-avg-hero-label">Overall Average</p>
                <div className="ts-avg-hero-value" style={{ color: scoreColor(myAvg) }}>
                  {myAvg.toFixed(1)}
                  <span className="ts-avg-hero-denom">/ {MAX_MARKS}</span>
                </div>
                {improvement !== null && (
                  <div className={`ts-avg-trend ${improvement > 0 ? 'up' : improvement < 0 ? 'down' : 'flat'}`}>
                    {improvement > 0
                      ? <><TrendingUp size={13} /> +{improvement} from T1 to T2</>
                      : improvement < 0
                      ? <><TrendingDown size={13} /> {improvement} from T1 to T2</>
                      : <><Minus size={13} /> No change between tests</>
                    }
                  </div>
                )}
              </div>
            )}

            {/* Individual scores */}
            <div className="ts-cards-grid">
              <ScoreCard label="Test 1" value={t1} stats={stats1} rank={rank1} />
              <ScoreCard label="Test 2" value={t2} stats={stats2} rank={rank2} />
            </div>

            {/* Divider */}
            <div className="ts-divider" />

            {/* Complaint status — informational only */}
            {myComplaints.length > 0 && (
              <div className="ts-status-list">
                {myComplaints.map(c => {
                  const statusMap = {
                    pending:  { icon: <Clock size={14} />,        label: 'Under Review',  cls: 'pending' },
                    approved: { icon: <CheckCircle size={14} />,  label: 'Approved',      cls: 'approved' },
                    rejected: { icon: <AlertTriangle size={14} />, label: 'Rejected',     cls: 'rejected' },
                  };
                  const s = statusMap[c.status] || statusMap.pending;
                  return (
                    <div key={c.id} className={`ts-status-item ${s.cls}`}>
                      {s.icon}
                      <div className="ts-status-text">
                        <span className="ts-status-title">{c.test === 'test1' ? 'Test 1' : 'Test 2'} Complaint — {s.label}</span>
                        {c.status === 'pending' && <span className="ts-status-sub">Claimed: {c.claimedMarks}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="ts-actions">
              <button
                className="ts-btn-primary"
                onClick={() => navigate('/maths')}
              >
                <LayoutDashboard size={15} /> View Full Maths Dashboard
              </button>
              {!pendingComplaint && !showForm && (
                <button className="ts-btn-ghost" onClick={() => setShowForm(true)}>
                  <AlertCircle size={14} /> Report an issue
                </button>
              )}
            </div>

            {/* Complaint form */}
            {showForm && (
              <form onSubmit={handleSubmit} className="ts-complaint-form">
                <h4 className="ts-form-title">Report an Issue</h4>

                <label className="ts-label">Complaint type
                  <select className="as-select" style={{ width: '100%', marginTop: '0.3rem' }}
                    value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="marks">Wrong marks recorded</option>
                    <option value="attendance">Wrong attendance (present/absent)</option>
                  </select>
                </label>

                <label className="ts-label">Which test?
                  <select className="as-select" style={{ width: '100%', marginTop: '0.3rem' }}
                    value={form.test} onChange={e => setForm(f => ({ ...f, test: e.target.value }))}>
                    <option value="test1">Test 1 — currently {t1 === null ? 'Absent' : t1}</option>
                    <option value="test2">Test 2 — currently {t2 === null ? 'Absent' : t2}</option>
                  </select>
                </label>

                {form.type === 'marks' ? (
                  <label className="ts-label">My actual marks (0–{MAX_MARKS})
                    <input className="auth-input" type="number" min="0" max={MAX_MARKS} placeholder="e.g. 8"
                      value={form.claimedMarks} onChange={e => setForm(f => ({ ...f, claimedMarks: e.target.value }))} required />
                  </label>
                ) : (
                  <label className="ts-label">I was actually
                    <select className="as-select" style={{ width: '100%', marginTop: '0.3rem' }}
                      value={form.claimedStatus} onChange={e => setForm(f => ({ ...f, claimedStatus: e.target.value }))}>
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                    </select>
                  </label>
                )}

                <label className="ts-label">Reason (optional)
                  <input className="auth-input" type="text" placeholder="e.g. I was present but marked absent"
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

          {/* ══ RIGHT COLUMN ══ */}
          <div className="ts-col-right">

            {/* You vs Class — comparison bars */}
            {(t1 !== null || t2 !== null) && (stats1 || stats2) && (
              <div className="ts-right-section">
                <p className="ts-right-section-title"><Users size={13} /> You vs Class Average</p>
                <div className="ts-compare-grid">
                  {[['Test 1', t1, stats1], ['Test 2', t2, stats2]].map(([lbl, myVal, st]) => {
                    if (!st) return null;
                    const myPct = myVal === null ? 0 : (myVal / MAX_MARKS) * 100;
                    const avgPct = (st.avg / MAX_MARKS) * 100;
                    const above = myVal !== null && myVal > st.avg;
                    return (
                      <div key={lbl} className="ts-compare-block">
                        <div className="ts-compare-block-header">
                          <span className="ts-compare-lbl">{lbl}</span>
                          <span className="ts-compare-delta" style={{ color: myVal === null ? '#6b7280' : above ? '#10b981' : '#f59e0b' }}>
                            {myVal === null ? 'Absent' : above ? `+${(myVal - st.avg).toFixed(1)} above avg` : myVal < st.avg ? `${(myVal - st.avg).toFixed(1)} below avg` : 'at avg'}
                          </span>
                        </div>
                        <div className="ts-cbar-group">
                          <div className="ts-cbar-row">
                            <span className="ts-cbar-lbl">You</span>
                            <div className="ts-cbar-track">
                              <div className="ts-cbar-fill you" style={{ width: `${myPct}%`, background: scoreColor(myVal) }} />
                            </div>
                            <span className="ts-cbar-val" style={{ color: scoreColor(myVal) }}>{myVal === null ? '—' : myVal}</span>
                          </div>
                          <div className="ts-cbar-row">
                            <span className="ts-cbar-lbl">Avg</span>
                            <div className="ts-cbar-track">
                              <div className="ts-cbar-fill avg" style={{ width: `${avgPct}%` }} />
                            </div>
                            <span className="ts-cbar-val">{st.avg.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Class Analytics — grouped by test */}
            <div className="ts-right-section">
              <p className="ts-right-section-title"><BarChart2 size={13} /> Class Analytics</p>
              <div className="ts-analytics-table">
                <div className="ts-analytics-head">
                  <span />
                  <span>Avg</span>
                  <span>High</span>
                  <span>Low</span>
                  <span>Present</span>
                </div>
                {[['Test 1', stats1], ['Test 2', stats2]].map(([lbl, st]) => (
                  st ? (
                    <div key={lbl} className="ts-analytics-row">
                      <span className="ts-analytics-test-lbl">{lbl}</span>
                      <span className="ts-analytics-val">{st.avg.toFixed(1)}</span>
                      <span className="ts-analytics-val hi">{st.highest}</span>
                      <span className="ts-analytics-val lo">{st.lowest}</span>
                      <span className="ts-analytics-val muted">{st.count}/{MATH_MARKS_RAW.length}</span>
                    </div>
                  ) : null
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
