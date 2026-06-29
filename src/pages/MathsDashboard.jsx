import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MATH_MARKS_RAW, MAX_MARKS } from '../data/mathMarks';
import { getOverrides } from '../services/marksService';
import { BarChart2, Download, FileText, TrendingUp, Users, Trophy, AlertTriangle, Star, Share2 } from 'lucide-react';

// ─── Brand colours ───────────────────────────────────────────
const C = {
  primary:   '#8b5cf6',
  secondary: '#ec4899',
  success:   '#10b981',
  danger:    '#ef4444',
  warning:   '#f59e0b',
  info:      '#3b82f6',
};
const GRADE_COLORS = [C.danger, C.warning, C.info, C.primary, C.success];

// ─── Data processing (override-aware) ────────────────────────
function resolveScore(overrides, roll, test) {
  const ov = overrides[roll];
  if (ov && ov[test] !== undefined) return ov[test];
  const val = MATH_MARKS_RAW.find(r => r.roll === roll)?.[test];
  return (val === 'Ab' || val === undefined) ? null : val;
}

function buildStudents(overrides) {
  return MATH_MARKS_RAW.map(s => {
    const t1 = resolveScore(overrides, s.roll, 'test1');
    const t2 = resolveScore(overrides, s.roll, 'test2');
    const eff = [t1, t2].filter(v => v !== null);
    // Absent counts as 0 — always average over 2 tests, not just present ones
    const avg  = eff.length ? ((t1 ?? 0) + (t2 ?? 0)) / 2 : null;
    const total = eff.length ? (t1 ?? 0) + (t2 ?? 0) : null;
    const improvement = (t1 !== null && t2 !== null) ? t2 - t1 : null;
    const absentBoth  = t1 === null && t2 === null;
    return { ...s, t1, t2, avg, total, improvement, absentBoth };
  });
}

function getBadge(s) {
  if (s.absentBoth)    return { label: 'Absent Both',    color: C.danger };
  if (s.avg === null)  return { label: 'Partial Absent', color: C.warning };
  if (s.avg >= 9)      return { label: 'Topper',         color: C.success };
  if (s.avg >= 7)      return { label: 'Good',           color: C.primary };
  if (s.avg >= 5)      return { label: 'Average',        color: C.info };
  if (s.avg >= 3)      return { label: 'Below Avg',      color: C.warning };
  return               { label: 'Needs Help',           color: C.danger };
}

function shortName(s) { return s.name.split(' ')[0]; }

// ─── Export helpers ──────────────────────────────────────────
function downloadCSV(students) {
  const rows = students.map(s => [
    s.roll, `"${s.name}"`,
    s.t1 ?? 'Absent', s.t2 ?? 'Absent',
    s.total ?? '-', s.avg != null ? s.avg.toFixed(2) : '-',
    getBadge(s).label,
  ].join(','));
  const csv = ['Roll,Name,Test1,Test2,Total,Average,Evaluation', ...rows].join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: 'maths_results.csv',
  });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function downloadPDF(students, t1Avg, t2Avg, attendanceRatio) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  doc.setFontSize(18); doc.setTextColor(139, 92, 246);
  doc.text('Maths Weekly Test Dashboard — Class 10 HI', 14, 18);
  doc.setFontSize(10); doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}  |  Students: ${students.length}  |  T1 Avg: ${t1Avg}  |  T2 Avg: ${t2Avg}  |  Attendance: ${attendanceRatio}%`, 14, 26);
  autoTable(doc, {
    startY: 32,
    head: [['Roll', 'Name', 'Test 1', 'Test 2', 'Total', 'Average', 'Status', 'Evaluation']],
    body: students.map(s => [
      s.roll, s.name,
      s.t1 ?? 'Absent', s.t2 ?? 'Absent',
      s.total ?? '—', s.avg?.toFixed(2) ?? '—',
      s.absentBoth ? 'Absent Both' : s.t2 === null ? 'Absent T2' : 'Present',
      getBadge(s).label,
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 245, 255] },
    columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 30 } },
  });
  doc.save('maths_results.pdf');
}

// ─── Tooltip style ────────────────────────────────────────────
const TT = {
  contentStyle: {
    background: '#18181b', border: '1px solid #27272a',
    borderRadius: 8, color: '#f8fafc', fontSize: 13,
  },
  cursor: { fill: 'rgba(139,92,246,0.08)' },
};
const axisStyle = { stroke: '#71717a', fontSize: 11 };

// ─── Sub-components ──────────────────────────────────────────
function StatCard({ label, value, sub, color, icon: Icon }) {
  return (
    <div className="md-stat-card">
      <div className="md-stat-icon" style={{ background: `${color}18`, color }}>
        <Icon size={16} />
      </div>
      <div className="md-stat-label">{label}</div>
      <div className="md-stat-value" style={{ color }}>{value}</div>
      {sub && <div className="md-stat-sub">{sub}</div>}
    </div>
  );
}

function InsightCard({ title, value, color }) {
  return (
    <div className="md-insight-card" style={{ borderLeftColor: color }}>
      <div className="md-insight-title">{title}</div>
      <div className="md-insight-value">{value}</div>
    </div>
  );
}

function HighlightRow({ s, color, rank, extra }) {
  return (
    <div className="md-hl-row">
      {rank && <span className="md-hl-rank" style={{ background: `${color}20`, color }}>{rank}</span>}
      <span className="md-hl-name">{s.name}</span>
      {s.avg !== null && !extra && <span className="md-hl-avg" style={{ color }}>avg {s.avg.toFixed(1)}</span>}
      {extra && <span className="md-hl-extra" style={{ color }}>{extra}</span>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
export default function MathsDashboard() {
  const [overrides, setOverrides] = useState({});
  const [search,    setSearch]    = useState('');
  const [sortKey,   setSortKey]   = useState('roll');
  const [sortDir,   setSortDir]   = useState('asc');
  const [distFilt,  setDistFilt]  = useState('both');
  const [fullFilt,  setFullFilt]  = useState('both');

  useEffect(() => {
    const prev = document.title;
    document.title = 'Maths Dashboard — 10th HI';
    return () => { document.title = prev; };
  }, []);

  useEffect(() => {
    getOverrides().then(setOverrides).catch(() => {});
  }, []);

  // All derived data — recomputed whenever overrides change
  const STUDENTS = useMemo(() => buildStudents(overrides), [overrides]);

  const t1Scores = useMemo(() => STUDENTS.filter(s => s.t1 !== null).map(s => s.t1), [STUDENTS]);
  const t2Scores = useMemo(() => STUDENTS.filter(s => s.t2 !== null).map(s => s.t2), [STUDENTS]);
  const t1Avg = useMemo(() => (t1Scores.reduce((a, b) => a + b, 0) / t1Scores.length).toFixed(2), [t1Scores]);
  const t2Avg = useMemo(() => (t2Scores.reduce((a, b) => a + b, 0) / t2Scores.length).toFixed(2), [t2Scores]);
  const t2Present = t2Scores.length;
  const t2Absent  = STUDENTS.length - t2Present;
  const attendanceRatio = ((t2Present / STUDENTS.length) * 100).toFixed(1);

  const highestScorer  = useMemo(() => [...STUDENTS].filter(s => s.avg !== null).sort((a, b) => b.avg - a.avg)[0], [STUDENTS]);
  const absentBothList = useMemo(() => STUDENTS.filter(s => s.absentBoth), [STUDENTS]);
  const top10          = useMemo(() => [...STUDENTS].filter(s => s.avg !== null).sort((a, b) => b.avg - a.avg).slice(0, 10), [STUDENTS]);
  const top5           = top10.slice(0, 5);
  const mostImproved   = useMemo(() => [...STUDENTS].filter(s => s.improvement !== null && s.t1 !== null).sort((a, b) => b.improvement - a.improvement).slice(0, 5), [STUDENTS]);
  const needAttention  = useMemo(() => [...STUDENTS].filter(s => s.avg !== null && s.avg < 4).sort((a, b) => a.avg - b.avg), [STUDENTS]);
  const allScores      = [...t1Scores, ...t2Scores];

  // Score distribution data (reactive)
  const distScores = useMemo(() => {
    const t1 = STUDENTS.filter(s => s.t1 !== null).map(s => s.t1);
    const t2 = STUDENTS.filter(s => s.t2 !== null).map(s => s.t2);
    if (distFilt === 't1') return t1;
    if (distFilt === 't2') return t2;
    return [...t1, ...t2];
  }, [distFilt, STUDENTS]);

  const distributionData = [
    { range: '0–2', count: distScores.filter(v => v <= 2).length },
    { range: '3–5', count: distScores.filter(v => v >= 3 && v <= 5).length },
    { range: '6–7', count: distScores.filter(v => v >= 6 && v <= 7).length },
    { range: '8–9', count: distScores.filter(v => v >= 8 && v <= 9).length },
    { range: '10',  count: distScores.filter(v => v === 10).length },
  ];

  const t1t2Compare = STUDENTS
    .filter(s => s.t1 !== null && s.t2 !== null)
    .map(s => ({ name: shortName(s), 'Test 1': s.t1, 'Test 2': s.t2 }));

  const filtered = useMemo(() => {
    let arr = STUDENTS.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    return arr.sort((a, b) => {
      let va = a[sortKey] ?? -999, vb = b[sortKey] ?? -999;
      if (typeof va === 'string') va = va.charCodeAt(0);
      if (typeof vb === 'string') vb = vb.charCodeAt(0);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [search, sortKey, sortDir, STUDENTS]);

  const fullMarkStudents = useMemo(() =>
    STUDENTS.filter(s =>
      fullFilt === 't1' ? s.t1 === MAX_MARKS :
      fullFilt === 't2' ? s.t2 === MAX_MARKS :
      s.t1 === MAX_MARKS || s.t2 === MAX_MARKS
    ), [fullFilt, STUDENTS]);

  return (
    <div className="md-page">

      {/* ── HERO ── */}
      <div className="md-hero">
        <div className="md-hero-badge">
          <BarChart2 size={13} /> Analytics Report
        </div>
        <h1 className="md-hero-title">Maths Dashboard</h1>
        <p className="md-hero-sub">
          Weekly Test 1 &amp; Test 2 · Class 10 HI · {STUDENTS.length} Students
        </p>
        <div className="md-hero-actions">
          <button className="md-btn-primary" onClick={() => downloadPDF(STUDENTS, t1Avg, t2Avg, attendanceRatio)}>
            <FileText size={15} /> Export PDF
          </button>
          <button className="md-btn-secondary" onClick={() => downloadCSV(STUDENTS)}>
            <Download size={15} /> Download CSV
          </button>
          <button className="md-btn-secondary" onClick={() => {
            const url = `${window.location.origin}/maths-share`;
            if (navigator.share) {
              navigator.share({ title: 'Maths Dashboard — Class 10 HI', url });
            } else {
              navigator.clipboard.writeText(url);
              alert('Link copied! Share it on WhatsApp.');
            }
          }}>
            <Share2 size={15} /> Share
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <section className="md-section">
        <div className="md-stat-grid">
          <StatCard label="Total Students"    value={STUDENTS.length} color={C.primary}   icon={Users} />
          <StatCard label="Present (Test 2)"  value={t2Present}       color={C.success}   icon={Users} />
          <StatCard label="Absent (Test 2)"   value={t2Absent}        color={C.danger}    icon={Users} />
          <StatCard label="Test 1 Average"    value={t1Avg}           color={C.info}      icon={BarChart2} />
          <StatCard label="Test 2 Average"    value={t2Avg}           color={C.secondary} icon={BarChart2} />
          <StatCard label="Top Scorer"        value={highestScorer.name.split(' ')[0]}     color={C.success}   icon={Trophy}       sub={`avg ${highestScorer.avg?.toFixed(1)}`} />
          <StatCard label="Absent Both Tests" value={absentBothList.length}                color={C.danger}    icon={AlertTriangle} />
          <StatCard label="Attendance Rate"   value={`${attendanceRatio}%`}               color={C.primary}   icon={TrendingUp} />
        </div>
      </section>

      {/* ── CHARTS ── */}
      <section className="md-section">
        <div className="md-section-header">
          <h2 className="md-section-title">Analytics Charts</h2>
          <p className="md-section-sub">Visual breakdown of class performance</p>
        </div>

        <div className="md-chart-grid-2">
          {/* Test avg comparison */}
          <div className="md-card">
            <h3 className="md-card-title">Average: Test 1 vs Test 2</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={[{ name: 'Test 1', avg: parseFloat(t1Avg) }, { name: 'Test 2', avg: parseFloat(t2Avg) }]} margin={{ top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="name" {...axisStyle} />
                <YAxis domain={[0, MAX_MARKS]} {...axisStyle} />
                <Tooltip {...TT} />
                <Bar dataKey="avg" fill={C.primary} radius={[6,6,0,0]} maxBarSize={80} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Attendance pie */}
          <div className="md-card">
            <h3 className="md-card-title">Test 2 Attendance</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={[{ name: 'Present', value: t2Present }, { name: 'Absent', value: t2Absent }]}
                  cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}
                  style={{ fontSize: 12 }}
                >
                  <Cell fill={C.success} />
                  <Cell fill={C.danger} />
                </Pie>
                <Tooltip {...TT} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="md-chart-grid-2">
          {/* Top 10 horizontal */}
          <div className="md-card">
            <h3 className="md-card-title">Top 10 Scorers (by Average)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={top10.map(s => ({ name: shortName(s), avg: parseFloat(s.avg.toFixed(1)) }))} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" />
                <XAxis type="number" domain={[0, MAX_MARKS]} {...axisStyle} />
                <YAxis dataKey="name" type="category" width={72} {...axisStyle} tick={{ fontSize: 11, fill: '#71717a' }} />
                <Tooltip {...TT} />
                <Bar dataKey="avg" fill={C.secondary} radius={[0,6,6,0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Score distribution with filter */}
          <div className="md-card">
            <div className="md-card-title-row">
              <h3 className="md-card-title">Score Distribution</h3>
              <div className="md-filter-pills">
                {['both','t1','t2'].map(f => (
                  <button key={f} className={`md-pill ${distFilt === f ? 'active' : ''}`} onClick={() => setDistFilt(f)}>
                    {f === 'both' ? 'Both' : f === 't1' ? 'Test 1' : 'Test 2'}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={distributionData} margin={{ top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="range" {...axisStyle} />
                <YAxis allowDecimals={false} {...axisStyle} />
                <Tooltip {...TT} />
                <Bar dataKey="count" radius={[6,6,0,0]} maxBarSize={60}>
                  {distributionData.map((_, i) => <Cell key={i} fill={GRADE_COLORS[i % GRADE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Student comparison — full width, scrollable */}
        <div className="md-card">
          <h3 className="md-card-title">Student Comparison (Test 1 vs Test 2)</h3>
          <div className="md-chart-scroll">
            <div style={{ minWidth: 680 }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={t1t2Compare} margin={{ top: 8, right: 8, left: -10, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                  <XAxis dataKey="name" {...axisStyle} tick={{ fontSize: 9 }} interval={0} angle={-45} textAnchor="end" />
                  <YAxis domain={[0, MAX_MARKS]} {...axisStyle} />
                  <Tooltip {...TT} />
                  <Legend wrapperStyle={{ paddingTop: 16 }} />
                  <Bar dataKey="Test 1" fill={C.primary}   radius={[4,4,0,0]} />
                  <Bar dataKey="Test 2" fill={C.secondary} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* ── SMART INSIGHTS ── */}
      <section className="md-section">
        <div className="md-section-header">
          <h2 className="md-section-title">Smart Insights</h2>
          <p className="md-section-sub">Automated analysis based on class performance</p>
        </div>
        <div className="md-insight-grid">
          <InsightCard color={C.info}      title="Best Performer"            value={`${highestScorer.name} (Avg: ${highestScorer.avg?.toFixed(1)})`} />
          <InsightCard color={C.success}   title="Most Improved"             value={`${mostImproved[0]?.name} (+${mostImproved[0]?.improvement} marks)`} />
          <InsightCard color={C.primary}   title="Highest Score Recorded"    value={`${Math.max(...allScores)} / ${MAX_MARKS}`} />
          <InsightCard color={C.danger}    title="Lowest Score Recorded"     value={`${Math.min(...allScores)} / ${MAX_MARKS}`} />
          <InsightCard color={C.warning}   title="Needs Attention"           value={`${needAttention.length} students (avg < 4)`} />
          <InsightCard color={C.danger}    title="Consistently Absent"       value={absentBothList.length > 0 ? absentBothList.map(s => s.name).join(', ') : 'None'} />
          <InsightCard color={C.success}   title="Perfect Scores (10/10)"    value={`${allScores.filter(v => v === MAX_MARKS).length} instances`} />
          <InsightCard color={C.secondary} title="Attendance Rate"           value={`${attendanceRatio}% present in Test 2`} />
          <InsightCard color={C.info}      title="Overall Class Trend"       value={`Avg shifted by ${(parseFloat(t2Avg) - parseFloat(t1Avg)).toFixed(2)} marks`} />
        </div>
      </section>

      {/* ── STUDENT TABLE ── */}
      <section className="md-section">
        <div className="md-section-header">
          <h2 className="md-section-title">Student Roster</h2>
          <p className="md-section-sub">Full list with search and sort</p>
        </div>
        <div className="md-card md-table-card">
          <div className="md-table-controls">
            <input
              className="md-search"
              placeholder="Search by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="md-select" value={sortKey} onChange={e => setSortKey(e.target.value)}>
              <option value="roll">Sort: Roll No.</option>
              <option value="name">Sort: Name</option>
              <option value="t1">Sort: Test 1</option>
              <option value="t2">Sort: Test 2</option>
              <option value="avg">Sort: Average</option>
            </select>
            <button className="md-sort-btn" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
              {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
          </div>
          <div className="md-table-wrap">
            <table className="md-table">
              <thead>
                <tr>
                  {['Roll','Name','Test 1','Test 2','Total','Average','T2 Status','Evaluation'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const badge = getBadge(s);
                  return (
                    <tr key={s.roll} className={s.absentBoth ? 'md-row-absent' : ''}>
                      <td className="md-td-muted">{s.roll}</td>
                      <td className="md-td-name">{s.name}</td>
                      <td>{s.t1 !== null ? s.t1 : <span className="md-absent-tag">Absent</span>}</td>
                      <td>{s.t2 !== null ? s.t2 : <span className="md-absent-tag">Absent</span>}</td>
                      <td>{s.total ?? '—'}</td>
                      <td className="md-td-avg">{s.avg?.toFixed(1) ?? '—'}</td>
                      <td>
                        <span className={`md-status ${s.t2 !== null ? 'present' : 'absent'}`}>
                          {s.t2 !== null ? 'Present' : 'Absent'}
                        </span>
                      </td>
                      <td>
                        <span className="md-badge" style={{ background: `${badge.color}18`, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHTS ── */}
      <section className="md-section">
        <div className="md-section-header">
          <h2 className="md-section-title">Special Highlights</h2>
          <p className="md-section-sub">Notable student groups and performance brackets</p>
        </div>
        <div className="md-hl-grid">

          {/* Top 5 */}
          <div className="md-card">
            <h3 className="md-card-title" style={{ color: C.info }}>🏆 Top 5 Students</h3>
            {top5.map((s, i) => <HighlightRow key={s.roll} s={s} color={C.info} rank={i+1} />)}
          </div>

          {/* Most Improved */}
          <div className="md-card">
            <h3 className="md-card-title" style={{ color: C.success }}>📈 Most Improved</h3>
            {mostImproved.map(s => <HighlightRow key={s.roll} s={s} color={C.success} extra={`+${s.improvement} marks`} />)}
          </div>

          {/* Full Marks */}
          <div className="md-card">
            <div className="md-card-title-row">
              <h3 className="md-card-title" style={{ color: C.primary }}>
                <Star size={14} style={{ display: 'inline', marginRight: 4 }} />Full Marks (10/10)
              </h3>
              <div className="md-filter-pills">
                {['both','t1','t2'].map(f => (
                  <button key={f} className={`md-pill ${fullFilt === f ? 'active' : ''}`} onClick={() => setFullFilt(f)}>
                    {f === 'both' ? 'Both' : f === 't1' ? 'T1' : 'T2'}
                  </button>
                ))}
              </div>
            </div>
            {fullMarkStudents.length === 0
              ? <p className="md-empty">No full marks in this selection.</p>
              : fullMarkStudents.map(s => {
                  const extra = fullFilt === 't1' ? 'T1: 10' : fullFilt === 't2' ? 'T2: 10' : `T1: ${s.t1 ?? 'Ab'} / T2: ${s.t2 ?? 'Ab'}`;
                  return <HighlightRow key={s.roll} s={s} color={C.primary} extra={extra} />;
                })
            }
          </div>

          {/* Needs Attention */}
          <div className="md-card">
            <h3 className="md-card-title" style={{ color: C.warning }}>⚠ Needs Attention (avg &lt; 4)</h3>
            {needAttention.length > 0
              ? needAttention.map(s => <HighlightRow key={s.roll} s={s} color={C.warning} />)
              : <p className="md-empty">No students in this bracket.</p>}
          </div>

          {/* Absent Both */}
          <div className="md-card">
            <h3 className="md-card-title" style={{ color: C.danger }}>❌ Absent in Both Tests</h3>
            {absentBothList.length > 0
              ? absentBothList.map(s => <HighlightRow key={s.roll} s={s} color={C.danger} />)
              : <p className="md-empty">None — great attendance!</p>}
          </div>

        </div>
      </section>

    </div>
  );
}
