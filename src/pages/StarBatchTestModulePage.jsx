import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getRecentTests, getUserTestHistory } from '../services/starBatchTestService';
import { syllabusData } from '../data/syllabusData';
import { Target, Play, TrendingUp, Search, Loader2, Star, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export default function StarBatchTestModulePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'report'
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
      const [fetchedTests, fetchedHistory] = await Promise.all([
        getRecentTests(),
        getUserTestHistory(currentUser.id || currentUser.phone)
      ]);
      setTests(fetchedTests);
      setHistory(fetchedHistory);
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,255,255,0.4)' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
        Loading Test Data...
      </div>
    );
  }

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
                      {isCompleted ? 'Retake Test' : 'Start Test'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'report' && (
        <div className="tm-report-grid">
          <div className="tm-stat-box">
            <h3 className="tm-stat-title"><TrendingUp size={20} color="#fbbf24" /> Performance Trend</h3>
            {chartData.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.4)' }}>Take some tests to see your trend!</p>
            ) : (
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fbbf24' }}
                      formatter={(value, name, props) => [`${props.payload.rawScore} / ${props.payload.total} (${value.toFixed(1)}%)`, 'Score']}
                    />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#10b981' : entry.score >= 50 ? '#fbbf24' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="tm-stat-box">
              <h3 className="tm-stat-title"><Star size={20} color="#fbbf24" /> Focus Areas</h3>
              {topWeakTopics.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>No weak topics identified yet.</p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {topWeakTopics.map((topic, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#e2e8f0' }}>
                      <XCircle size={16} color="#ef4444" /> {topic}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="tm-stat-box" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.1) 0%, rgba(245,158,11,0.05) 100%)', borderColor: 'rgba(251,191,36,0.2)' }}>
              <h3 className="tm-stat-title" style={{ color: '#fbbf24' }}>Recent AI Insight</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6, color: '#f1f5f9' }}>
                {history.length > 0 
                  ? (Array.isArray(history[0].aiReview) ? history[0].aiReview[0] : history[0].aiReview || 'Keep practicing to get detailed AI insights!')
                  : 'Take a test to receive personalized AI feedback here.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
