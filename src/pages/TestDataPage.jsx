import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getTestData } from '../services/testDataService';
import {
  Beaker, CalendarDays, Clock, CheckCircle2, AlertCircle,
  BookOpen, ChevronRight, ArrowLeft, Layers
} from 'lucide-react';

/* ── Helpers ─────────────────────────────────────────────────── */
function fmtDate(str) {
  if (!str) return null;
  const d = new Date(str);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtShort(str) {
  if (!str) return null;
  const d = new Date(str);
  if (isNaN(d)) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function isUpcoming(str) {
  if (!str) return false;
  return new Date(str) >= new Date(new Date().toDateString());
}

/* ── Status pill ─────────────────────────────────────────────── */
function StatusPill({ status }) {
  const accurate = status === 'accurate';
  return (
    <span className={`td-status-pill ${accurate ? 'accurate' : 'predicted'}`}>
      {accurate ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
      {accurate ? 'Confirmed' : 'Predicted'}
    </span>
  );
}

/* ── Section card ────────────────────────────────────────────── */
function SectionCard({ section }) {
  const hasMultiSub = section.subsections?.length > 1 || section.subsections?.[0]?.name;

  return (
    <div className="td-section-card">
      {/* Card header */}
      <div className="td-section-header">
        <div className="td-section-header-left">
          <h3 className="td-section-name">{section.name}</h3>
          {section.date && (
            <span className="td-section-date">
              <CalendarDays size={12} /> {fmtShort(section.date)}
              {isUpcoming(section.date) && <span className="td-upcoming-dot" />}
            </span>
          )}
        </div>
        <div className="td-section-header-right">
          <StatusPill status={section.status} />
          {section.totalMarks > 0 && (
            <div className="td-fm-badge">
              <span className="td-fm-label">FM</span>
              <span className="td-fm-value">{section.totalMarks}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chapters */}
      <div className="td-chapters-wrap">
        {(!section.subsections || section.subsections.length === 0) && (
          <p className="td-tba">Syllabus to be announced</p>
        )}

        {section.subsections?.map((sub, i) => (
          <div key={i} className={`td-subsection ${hasMultiSub ? 'td-subsection--named' : ''}`}>
            {/* Sub-heading: Physics / Chemistry / Bio etc */}
            {sub.name && (
              <div className="td-sub-heading">
                <ChevronRight size={13} className="td-sub-chevron" />
                <span>{sub.name}</span>
              </div>
            )}

            {/* Chapter list */}
            {(!sub.chapters || sub.chapters.length === 0) ? (
              <p className="td-tba" style={{ marginLeft: sub.name ? '1.4rem' : 0 }}>TBA</p>
            ) : (
              <ul className="td-chapter-list" style={{ paddingLeft: sub.name ? '1.4rem' : 0 }}>
                {sub.chapters.map((ch, j) => (
                  <li key={j} className="td-chapter-item">
                    <span className="td-chapter-dot" />
                    {ch}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function TestDataPage() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !currentUser) navigate('/');
  }, [currentUser, loading, navigate]);

  useEffect(() => {
    let active = true;
    getTestData()
      .then(d => {
        if (!active) return;
        if (!d || !d.visible) navigate('/');
        else setData(d);
      })
      .catch(() => navigate('/'))
      .finally(() => { if (active) setFetching(false); });
    return () => { active = false; };
  }, [navigate]);

  if (!currentUser || fetching) return (
    <div className="td-page">
      <div className="td-loading">
        <div className="td-loading-shimmer" />
        <div className="td-loading-shimmer" style={{ width: '60%' }} />
        <div className="td-loading-shimmer" style={{ width: '80%' }} />
      </div>
    </div>
  );

  if (!data) return null;

  const sections = data.sections || [];
  const totalFM  = sections.reduce((s, sec) => s + (sec.totalMarks || 0), 0);
  const from = fmtShort(data.dateFrom);
  const to   = fmtShort(data.dateTo);
  const fromFull = fmtDate(data.dateFrom);
  const toFull   = fmtDate(data.dateTo);
  const dateRange = from && to ? `${from} – ${to}` : from || null;

  return (
    <div className="td-page animate-fade-in fade-in-up">

      {/* Back button */}
      <button className="td-back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Hero */}
      <div className="td-hero glass-card">
        <div className="td-hero-glow" />

        <div className="td-hero-top">
          <div className="td-hero-icon"><Beaker size={24} /></div>
          <span className="td-hero-label">Upcoming Test</span>
        </div>

        <h1 className="td-hero-title">{data.testName}</h1>
        {data.description && <p className="td-hero-desc">{data.description}</p>}

        <div className="td-hero-meta">
          {dateRange && (
            <div className="td-meta-chip">
              <CalendarDays size={14} />
              <span>{fromFull ? `${fromFull}${toFull && toFull !== fromFull ? ` – ${toFull}` : ''}` : dateRange}</span>
            </div>
          )}
          {data.period && (
            <div className="td-meta-chip">
              <Clock size={14} />
              <span>{data.period}</span>
            </div>
          )}
          {totalFM > 0 && (
            <div className="td-meta-chip td-meta-chip--accent">
              <Layers size={14} />
              <span>Total FM: {totalFM}</span>
            </div>
          )}
        </div>
      </div>

      {/* FM Overview Strip */}
      {sections.length > 0 && (
        <div className="td-fm-strip">
          {sections.map(sec => (
            <div key={sec.id} className="td-fm-strip-item">
              <span className="td-fm-strip-name">{sec.name}</span>
              <span className="td-fm-strip-fm">FM {sec.totalMarks || '—'}</span>
              {sec.date && <span className="td-fm-strip-date">{fmtShort(sec.date)}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Section heading */}
      {sections.length > 0 && (
        <div className="td-sections-label">
          <BookOpen size={16} />
          <span>Syllabus by Subject</span>
        </div>
      )}

      {/* Section cards grid */}
      {sections.length === 0 ? (
        <div className="rec-empty">
          <BookOpen size={40} />
          <p>No syllabus added yet. Check back soon.</p>
        </div>
      ) : (
        <div className="td-sections-grid">
          {sections.map(sec => (
            <SectionCard key={sec.id} section={sec} />
          ))}
        </div>
      )}
    </div>
  );
}
