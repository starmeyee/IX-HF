import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getTestById, submitTestAttempt, getUserTestAttemptsForTest, getTestAverageScore } from '../services/starBatchTestService';
import { Loader2, ArrowLeft, CheckCircle, XCircle, Sparkles, Target, BarChart2, Zap, AlertCircle, BookOpen, Clock, Activity, Flag, Crosshair, ChevronDown, ChevronUp } from 'lucide-react';

import TestAnalyticsDashboard from '../components/TestAnalyticsDashboard';

export default function StarBatchTestPlayerPage() {
  const { testId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [averageScore, setAverageScore] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    if (!currentUser) navigate('/');
    else if (!currentUser.isStarBatch || !currentUser.hasUnlockedStarBatch) navigate('/star-batch');
    else fetchTest();
  }, [testId, currentUser, navigate]);

  async function fetchTest() {
    setLoading(true);
    try {
      const [data, attempts, avg] = await Promise.all([
        getTestById(testId),
        getUserTestAttemptsForTest(currentUser.id || currentUser.phone, testId),
        getTestAverageScore(testId)
      ]);
      setAverageScore(avg);
      
      let seenIndices = new Set();
      attempts.forEach(a => {
        (a.seenIndices || []).forEach(idx => seenIndices.add(idx));
      });

      const allIndices = data.questions.map((_, i) => i);
      let unseenIndices = allIndices.filter(i => !seenIndices.has(i));

      const shuffle = (array) => {
        let arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      };

      unseenIndices = shuffle(unseenIndices);
      let selectedIndices = unseenIndices.slice(0, 10);

      if (selectedIndices.length < 10) {
        let seenArr = shuffle(Array.from(seenIndices));
        const needed = 10 - selectedIndices.length;
        selectedIndices = [...selectedIndices, ...seenArr.slice(0, needed)];
      }
      
      const questionsToShow = selectedIndices.map(idx => ({
        ...data.questions[idx],
        originalIndex: idx
      }));

      setTest(data);
      setActiveQuestions(questionsToShow);
    } catch (e) {
      setError('Test not found or access denied.');
    } finally {
      setLoading(false);
    }
  }

  function handleOptionSelect(qIndex, optIndex) {
    if (result) return;
    setAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
  }

  async function handleSubmit() {
    if (!window.confirm('Are you sure you want to submit?')) return;
    
    setIsSubmitting(true);
    let score = 0;
    const weakTopics = [];
    const difficultyStats = { Easy: { correct: 0, total: 0 }, Medium: { correct: 0, total: 0 }, Hard: { correct: 0, total: 0 } };
    const topicStats = {};

    activeQuestions.forEach((q, index) => {
      const isCorrect = answers[index] === q.correctOptionIndex;
      if (isCorrect) score += 1;
      else if (q.topic) weakTopics.push(q.topic);
      
      const diff = q.difficulty || 'Medium';
      if (!difficultyStats[diff]) difficultyStats[diff] = { correct: 0, total: 0 };
      difficultyStats[diff].total += 1;
      if (isCorrect) difficultyStats[diff].correct += 1;

      const top = q.topic || 'General';
      if (!topicStats[top]) topicStats[top] = { correct: 0, total: 0 };
      topicStats[top].total += 1;
      if (isCorrect) topicStats[top].correct += 1;
    });

    const seenIndices = activeQuestions.map(q => q.originalIndex);

    try {
      let aiReview = [];
      try {
        const res = await fetch('/api/ai-test-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score, total: activeQuestions.length, difficultyStats, topicStats })
        });
        if (res.ok) {
          const data = await res.json();
          aiReview = data.insights || [];
        }
      } catch (aiErr) {
        console.error('AI Review Failed', aiErr);
        aiReview = ['Great effort! Review your mistakes to improve.'];
      }

      await submitTestAttempt({
        userId: currentUser.id || currentUser.phone,
        testId: test.id,
        chapterId: test.chapterId,
        score,
        total: activeQuestions.length,
        responses: answers,
        weakTopics: [...new Set(weakTopics)],
        seenIndices,
        aiReview
      });

      setResult({ score, total: activeQuestions.length, aiReview, difficultyStats, topicStats });
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    } catch (e) {
      alert('Failed to submit test. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '5rem 0', color: 'rgba(255,255,255,0.5)' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
      Loading Test...
    </div>
  );

  if (error || !test) return (
    <div style={{ textAlign: 'center', color: '#f87171', padding: '3rem' }}>{error}</div>
  );

  return (
    <div style={{ animation: 'fade-in 0.4s ease', paddingBottom: '6rem', maxWidth: '800px', margin: '0 auto' }}>
      <style>{`
        .tp-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
        .tp-back { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: #fff; cursor: pointer; transition: all 0.2s; }
        .tp-back:hover { background: rgba(255,255,255,0.1); }
        .tp-title { font-size: 1.5rem; font-weight: 800; color: #fff; margin: 0; }
        
        .tp-q-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .tp-q-text { font-size: 1.1rem; color: #f1f5f9; line-height: 1.6; margin: 0 0 1.25rem; white-space: pre-wrap; }
        .tp-q-meta { font-size: 0.75rem; color: rgba(251,191,36,0.8); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-bottom: 0.75rem; display: flex; gap: 0.75rem; }
        
        .tp-opt { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; margin-bottom: 0.75rem; cursor: pointer; transition: all 0.2s; }
        .tp-opt:hover:not(.disabled) { background: rgba(255,255,255,0.06); }
        .tp-opt.selected { background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.4); }
        .tp-opt.disabled { cursor: default; }
        
        .tp-opt-circle { width: 24px; height: 24px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; color: rgba(255,255,255,0.5); }
        .tp-opt.selected .tp-opt-circle { border-color: #fbbf24; color: #fbbf24; }

        .tp-submit { width: 100%; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border: none; border-radius: 12px; padding: 1.1rem; color: #000; font-weight: 800; font-size: 1.1rem; cursor: pointer; transition: all 0.2s; margin-top: 1rem; display: flex; justify-content: center; align-items: center; gap: 0.5rem; }
        .tp-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(245,158,11,0.3); }
        .tp-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .tp-nav-btn { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1.1rem; color: #fff; font-weight: 700; font-size: 1.05rem; cursor: pointer; transition: all 0.2s; display: flex; justify-content: center; align-items: center; }
        .tp-nav-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
        .tp-nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .tp-nav-btn.primary { background: rgba(251,191,36,0.15); border-color: rgba(251,191,36,0.3); color: #fbbf24; }
        .tp-nav-btn.primary:hover:not(:disabled) { background: rgba(251,191,36,0.25); }
      `}</style>

      <div className="tp-header">
        <button className="tp-back" onClick={() => navigate('/star-tests')}><ArrowLeft size={20} /></button>
        <h1 className="tp-title">{test.title}</h1>
      </div>

      {result ? (
        <TestAnalyticsDashboard 
          result={result} 
          activeQuestions={activeQuestions} 
          answers={answers} 
          averageScore={averageScore} 
        />
      ) : (
        <div style={{ animation: 'fade-in 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontWeight: 600 }}>
            <span>Question {currentQuestionIndex + 1} of {activeQuestions.length}</span>
            <span>{Object.keys(answers).length} / {activeQuestions.length} Answered</span>
          </div>
          
          <div className="tp-q-card">
            <div className="tp-q-meta">
              <span>Q{currentQuestionIndex + 1}</span>
            </div>
            <p className="tp-q-text">{activeQuestions[currentQuestionIndex].text}</p>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activeQuestions[currentQuestionIndex].options.map((opt, optIndex) => {
                const isSelected = answers[currentQuestionIndex] === optIndex;
                let optClass = isSelected ? 'selected ' : '';
                return (
                  <div 
                    key={optIndex} 
                    className={`tp-opt ${optClass}`}
                    onClick={() => handleOptionSelect(currentQuestionIndex, optIndex)}
                  >
                    <div className="tp-opt-circle">
                      {String.fromCharCode(65 + optIndex)}
                    </div>
                    <span style={{ flex: 1, color: isSelected ? '#fff' : '#e2e8f0' }}>{opt}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button 
              className="tp-nav-btn" 
              onClick={() => setCurrentQuestionIndex(prev => prev - 1)} 
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </button>
            
            {currentQuestionIndex < activeQuestions.length - 1 ? (
              <button 
                className="tp-nav-btn primary" 
                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
              >
                Next
              </button>
            ) : (
              <button 
                className="tp-submit" 
                onClick={handleSubmit} 
                disabled={isSubmitting || Object.keys(answers).length < activeQuestions.length}
                style={{ flex: 1, marginTop: 0 }}
              >
                {isSubmitting ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Submit Test'}
              </button>
            )}
          </div>
          {Object.keys(answers).length < activeQuestions.length && currentQuestionIndex === activeQuestions.length - 1 && (
            <div style={{ textAlign: 'center', marginTop: '1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              You must answer all {activeQuestions.length} questions before submitting.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
