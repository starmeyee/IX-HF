import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getRecentTests, getUserTestHistory, getMacroReport, saveMacroReport } from '../services/starBatchTestService';
import { syllabusData } from '../data/syllabusData';
import { Target, Play, TrendingUp, Search, Loader2, Star, CheckCircle, XCircle, ChevronDown, ChevronUp, BookOpen, Calendar, ArrowRight, BrainCircuit, Sparkles, AlertCircle, Clock, Flag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export default function StarBatchTestModulePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'report'
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [expandedChapter, setExpandedChapter] = useState(null);
  const [macroReport, setMacroReport] = useState(null);
  const [isGeneratingMacro, setIsGeneratingMacro] = useState(false);
  const [tests, setTests] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!currentUser) navigate('/');
    else if (!currentUser.isStarBatch || !currentUser.hasUnlockedStarBatch) navigate('/star-batch');
    else fetchData();
  }, [currentUser, navigate]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const userId = currentUser.id || currentUser.phone;
      const [fetchedTests, fetchedHistory, fetchedMacro] = await Promise.all([
        getRecentTests(),
        getUserTestHistory(userId),
        getMacroReport(userId)
      ]);
      setTests(fetchedTests);
      setHistory(fetchedHistory);
      setMacroReport(fetchedMacro);
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to load test data");
    } finally {
      setLoading(false);
    }
  }

  const filteredTests = tests.filter(t => 
    t.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Chart Data Preparation
  const chartData = [...history].reverse().map((h, i) => ({
    name: `Test ${i + 1}`,
    score: (h.score / h.total) * 100, // percentage
    rawScore: h.score,
    total: h.total,
    title: tests.find(t => t.id === h.testId)?.title || 'Test'
  }));

  // Aggregate Weak Topics
  const allWeakTopics = history.flatMap(h => h.weakTopics || []);
  const topicCounts = allWeakTopics.reduce((acc, t) => {
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const topWeakTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0]);

  // Grouping logic for History Drill-down
  const chapterToSubjectMap = {};
  const subjectNameMap = {};
  const chapterNameMap = {};
  
  syllabusData.forEach(section => {
    section.subjects.forEach(subject => {
      subjectNameMap[subject.subjectId] = subject.subjectName;
      subject.chapters.forEach(chapter => {
        chapterToSubjectMap[chapter.chapterId] = subject.subjectId;
        chapterNameMap[chapter.chapterId] = chapter.chapterName;
      });
    });
  });

  const subjectAggregatesMap = {};
  history.forEach(attempt => {
    const cId = attempt.chapterId;
    // tests might not have chapterId if they are older or generic, fallback to 'misc'
    const sId = cId ? (chapterToSubjectMap[cId] || 'misc') : 'misc';
    
    if (!subjectAggregatesMap[sId]) {
      subjectAggregatesMap[sId] = {
        subjectId: sId,
        subjectName: subjectNameMap[sId] || 'Miscellaneous',
        totalScore: 0,
        totalMax: 0,
        testsCount: 0,
        chapters: {}
      };
    }
    
    const subj = subjectAggregatesMap[sId];
    subj.totalScore += attempt.score || 0;
    subj.totalMax += attempt.total || 0;
    subj.testsCount += 1;
    
    const displayCId = cId || 'misc-chapter';
    if (!subj.chapters[displayCId]) {
      subj.chapters[displayCId] = {
        chapterId: displayCId,
        chapterName: chapterNameMap[displayCId] || 'General Tests',
        totalScore: 0,
        totalMax: 0,
        testsCount: 0,
        attempts: []
      };
    }
    
    const chap = subj.chapters[displayCId];
    chap.totalScore += attempt.score || 0;
    chap.totalMax += attempt.total || 0;
    chap.testsCount += 1;
    chap.attempts.push(attempt);
  });

  const subjectAggregates = Object.values(subjectAggregatesMap).sort((a, b) => b.testsCount - a.testsCount);

  async function handleGenerateMacro() {
    if (history.length === 0) {
      alert("Take some tests first!");
      return;
    }
    
    if (macroReport && macroReport.updatedAt) {
      const lastGen = macroReport.updatedAt.toDate ? macroReport.updatedAt.toDate() : new Date(macroReport.updatedAt);
      const hoursSince = (new Date() - lastGen) / (1000 * 60 * 60);
      if (hoursSince < 24 && currentUser?.role !== 'ADMIN') {
        alert(`You can generate a new report in ${Math.ceil(24 - hoursSince)} hours.`);
        return;
      }
    }

    setIsGeneratingMacro(true);
    try {
      const overallAccuracy = history.length > 0 
        ? Math.round((history.reduce((sum, h) => sum + (h.score/h.total), 0) / history.length) * 100)
        : 0;
        
      const reqData = {
        totalTests: history.length,
        overallAccuracy,
        subjectAggregates: subjectAggregates.map(s => ({ subject: s.subjectName, tests: s.testsCount, accuracy: Math.round((s.totalScore/s.totalMax)*100) })),
        weakTopics: topWeakTopics
      };

      const res = await fetch('/api/ai-macro-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqData)
      });
      
      if (!res.ok) throw new Error("Failed to generate report");
      
      const data = await res.json();
      const userId = currentUser.id || currentUser.phone;
      
      await saveMacroReport(userId, { report: data.reportData });
      
      setMacroReport({
        report: data.reportData,
        updatedAt: new Date()
      });
      
    } catch (e) {
      console.error(e);
      alert("Error generating report. Please try again.");
    } finally {
      setIsGeneratingMacro(false);
    }
  }

  if (loading) return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,255,255,0.4)' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
        Loading Test Data...
      </div>
    );

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: '#f87171' }}>
        <XCircle size={32} style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
        <p style={{ margin: 0, fontWeight: 600 }}>Error loading tests</p>
        <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fade-in 0.4s ease', paddingBottom: '6rem' }}>
      <style>{`
        .tm-header { margin-bottom: 2rem; }
        .tm-title { display: flex; align-items: center; gap: 0.6rem; margin: 0; font-size: 1.5rem; font-weight: 800; color: #fff; }
        .tm-subtitle { color: rgba(255,255,255,0.5); font-size: 0.9rem; margin: 0.2rem 0 0; }
        
        .tm-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; background: rgba(255,255,255,0.03); padding: 0.4rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); width: fit-content; }
        .tm-tab { padding: 0.6rem 1.25rem; border-radius: 8px; border: none; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; background: transparent; color: rgba(255,255,255,0.5); }
        .tm-tab:hover { color: #fff; }
        .tm-tab.active { background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }

        .tm-search { display: flex; align-items: center; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 0 1rem; margin-bottom: 1.5rem; max-width: 400px; }
        .tm-search input { width: 100%; background: none; border: none; color: #fff; padding: 0.8rem 0.5rem; outline: none; font-size: 0.9rem; }

        .tm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
        .tm-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.5rem; transition: all 0.2s; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem; }
        .tm-card:hover { border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.02); transform: translateY(-2px); }
        .tm-card-title { font-size: 1.1rem; font-weight: 700; color: #f1f5f9; margin: 0; }
        .tm-card-meta { font-size: 0.8rem; color: rgba(255,255,255,0.4); display: flex; gap: 1rem; margin-top: 0.4rem; }
        
        .tm-btn { width: 100%; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border: none; border-radius: 10px; padding: 0.75rem; color: #000; font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; cursor: pointer; transition: all 0.2s; }
        .tm-btn:hover { box-shadow: 0 4px 15px rgba(245,158,11,0.3); transform: scale(1.02); }

        .tm-report-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        @media (min-width: 768px) { .tm-report-grid { grid-template-columns: 2fr 1fr; } }
        
        .tm-stat-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.5rem; }
        .tm-stat-title { font-size: 1rem; font-weight: 700; color: #fff; margin: 0 0 1.5rem; display: flex; align-items: center; gap: 0.5rem; }
      `}</style>

      <div className="tm-header">
        <h2 className="tm-title"><Target size={24} color="#fbbf24" /> Elite Testing Module</h2>
        <p className="tm-subtitle">Evaluate your knowledge with curated MCQ tests.</p>
      </div>

      <div className="tm-tabs">
        <button className={`tm-tab ${activeTab === 'tests' ? 'active' : ''}`} onClick={() => setActiveTab('tests')}>Available Tests</button>
        <button className={`tm-tab ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>My Report Card</button>
      </div>

      {activeTab === 'tests' && (
        <>
          <div className="tm-search">
            <Search size={18} color="rgba(255,255,255,0.4)" />
            <input 
              type="text" 
              placeholder="Search tests..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
            />
          </div>

          {filteredTests.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '3rem 0' }}>
              No tests found.
            </div>
          ) : (
            <div className="tm-grid">
              {filteredTests.map(test => {
                const isCompleted = history.some(h => h.testId === test.id);
                
                return (
                  <div key={test.id} className="tm-card">
                    <div>
                      <h3 className="tm-card-title">{test.title}</h3>
                      <div className="tm-card-meta">
                        <span>{Math.min(test.questions.length, 10)} Questions</span>
                        <span>{isCompleted ? 'Completed' : 'Not Attempted'}</span>
                      </div>
                    </div>
                    <button 
                      className="tm-btn" 
                      onClick={() => navigate(`/star-tests/${test.id}`)}
                      style={isCompleted ? { background: 'rgba(255,255,255,0.1)', color: '#fff' } : {}}
                    >
                      <Play size={16} fill={isCompleted ? 'none' : 'currentColor'} /> 
                      {isCompleted ? 'New Practice Test' : 'Start Test'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="tm-stat-box" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(5,150,105,0.05) 100%)', borderColor: 'rgba(16,185,129,0.2)' }}>
            <div>
              <h3 className="tm-stat-title" style={{ color: '#10b981', margin: '0 0 0.5rem' }}><Target size={20} /> Total Tests Taken</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff' }}>{history.length}</div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
              <button 
                onClick={handleGenerateMacro}
                disabled={isGeneratingMacro}
                style={{ background: isGeneratingMacro ? 'rgba(16,185,129,0.5)' : '#10b981', color: '#000', border: 'none', padding: '0.8rem 1.2rem', borderRadius: '8px', fontWeight: 700, cursor: isGeneratingMacro ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
              >
                {isGeneratingMacro ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <BrainCircuit size={18} />}
                {isGeneratingMacro ? 'Analyzing Data...' : 'Generate Macro Progress Report'}
              </button>
              {macroReport && macroReport.updatedAt && (
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                  Last generated: {macroReport.updatedAt.toDate ? macroReport.updatedAt.toDate().toLocaleString() : new Date(macroReport.updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {isGeneratingMacro ? (
            <div style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '16px', padding: '4rem 2rem', textAlign: 'center', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
              <BrainCircuit size={56} color="#38bdf8" style={{ margin: '0 auto 1.5rem', animation: 'bounce 2s infinite' }} />
              <h3 style={{ margin: '0 0 0.5rem', color: '#38bdf8', fontSize: '1.4rem' }}>AI is analyzing your entire history...</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>Comparing your performance against syllabus standards. Please wait 10-15 seconds.</p>
            </div>
          ) : macroReport ? (
            <div style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '16px', padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.5rem' }}>
                  <Sparkles size={24} /> AI Strategic Report
                </h3>
              </div>
              
              {typeof macroReport.report === 'string' ? (
                // Fallback for old string reports
                <div style={{ color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.6 }} className="markdown-body custom-md">
                  <ReactMarkdown>{macroReport.report}</ReactMarkdown>
                </div>
              ) : (
                // New structured UI
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ fontSize: '1.1rem', color: '#e2e8f0', lineHeight: 1.6, background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {macroReport.report.summary}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={18}/> Key Strengths</h4>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(macroReport.report.strengths || []).map((s, i) => (
                          <li key={i} style={{ color: '#e2e8f0', fontSize: '0.95rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}><CheckCircle size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }}/> {s}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={18}/> Critical Weaknesses</h4>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(macroReport.report.weaknesses || []).map((w, i) => (
                          <li key={i} style={{ color: '#e2e8f0', fontSize: '0.95rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}><XCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }}/> {w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {macroReport.report.focusDistribution && macroReport.report.focusDistribution.length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 1.5rem 0', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={18}/> Recommended Focus Distribution</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {macroReport.report.focusDistribution.map((f, i) => (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                              <div>
                                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.95rem' }}>{f.topic}</div>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{f.reason}</div>
                              </div>
                              <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '1.1rem' }}>{f.percentage}%</div>
                            </div>
                            <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                              <div style={{ width: `${f.percentage}%`, background: '#f59e0b', height: '100%', borderRadius: '4px' }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {macroReport.report.actionPlan && macroReport.report.actionPlan.length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 1.5rem 0', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Flag size={18}/> 48-Hour Action Plan</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                        {macroReport.report.actionPlan.map((action, i) => (
                          <div key={i} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', padding: '1.25rem', borderLeft: '4px solid #a855f7' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <div style={{ color: '#a855f7', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>Step {i+1}</div>
                              {action.time && <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={12}/> {action.time}</div>}
                            </div>
                            <div style={{ color: '#fff', fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.4rem' }}>{action.title}</div>
                            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: 1.5 }}>{action.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          <h3 style={{ color: '#f8fafc', fontSize: '1.3rem', margin: '1rem 0 0' }}>Subject Performance</h3>
          
          {subjectAggregates.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '3rem 0' }}>No tests taken yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {subjectAggregates.map(subj => (
                <div key={subj.subjectId} className="tm-stat-box" style={{ padding: '0', overflow: 'hidden' }}>
                  <div 
                    onClick={() => setExpandedSubject(expandedSubject === subj.subjectId ? null : subj.subjectId)}
                    style={{ padding: '1.2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expandedSubject === subj.subjectId ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 0.3rem', fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BookOpen size={18} color="#fbbf24" /> {subj.subjectName}
                      </h4>
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>{subj.testsCount} Tests Taken</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: (subj.totalScore/subj.totalMax)*100 >= 80 ? '#10b981' : (subj.totalScore/subj.totalMax)*100 >= 50 ? '#fbbf24' : '#ef4444' }}>
                          {subj.totalMax > 0 ? Math.round((subj.totalScore / subj.totalMax) * 100) : 0}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Average</div>
                      </div>
                      {expandedSubject === subj.subjectId ? <ChevronUp size={20} color="rgba(255,255,255,0.5)" /> : <ChevronDown size={20} color="rgba(255,255,255,0.5)" />}
                    </div>
                  </div>

                  {expandedSubject === subj.subjectId && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                      {Object.values(subj.chapters).map(chap => (
                        <div key={chap.chapterId}>
                          <div 
                            onClick={() => setExpandedChapter(expandedChapter === chap.chapterId ? null : chap.chapterId)}
                            style={{ padding: '1rem 1.5rem 1rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                          >
                            <div>
                              <div style={{ fontSize: '0.95rem', color: '#e2e8f0', fontWeight: 500 }}>{chap.chapterName}</div>
                              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem' }}>{chap.testsCount} Attempts</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: (chap.totalScore/chap.totalMax)*100 >= 80 ? '#10b981' : (chap.totalScore/chap.totalMax)*100 >= 50 ? '#fbbf24' : '#ef4444' }}>
                                {chap.totalMax > 0 ? Math.round((chap.totalScore / chap.totalMax) * 100) : 0}%
                              </div>
                              {expandedChapter === chap.chapterId ? <ChevronUp size={16} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.3)" />}
                            </div>
                          </div>
                          
                          {expandedChapter === chap.chapterId && (
                            <div style={{ padding: '0.5rem 1.5rem 1.5rem 4.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {chap.attempts.map((attempt) => (
                                <div key={attempt.id} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '8px', gap: '0.5rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Calendar size={14} color="rgba(255,255,255,0.5)" />
                                    <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                                      {attempt.createdAt?.toDate ? attempt.createdAt.toDate().toLocaleDateString() : new Date(attempt.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{attempt.score} / {attempt.total}</span>
                                    <button 
                                      onClick={() => navigate(`/star-tests/history/${attempt.id}`)}
                                      style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                    >
                                      View Analysis <ArrowRight size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
