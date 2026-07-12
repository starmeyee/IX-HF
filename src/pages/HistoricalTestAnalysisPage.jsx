import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTestAttemptById, getTestById } from '../services/starBatchTestService';
import TestAnalyticsDashboard from '../components/TestAnalyticsDashboard';
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react';

export default function HistoricalTestAnalysisPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState(null);
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!attemptId) {
      setError("No Attempt ID provided");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const attemptDoc = await getTestAttemptById(attemptId);
        setAttempt(attemptDoc);

        const testDoc = await getTestById(attemptDoc.testId);
        setTestData(testDoc);
      } catch (err) {
        console.error("Failed to load historical test:", err);
        setError("Failed to load the historical test analysis. It may have been deleted or doesn't exist.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [attemptId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 0', color: 'rgba(255,255,255,0.5)' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
        Loading Historical Analysis...
      </div>
    );
  }

  if (error || !attempt || !testData) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '2rem', borderRadius: '12px' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#ef4444', margin: '0 0 1rem' }}>Analysis Not Found</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>{error}</p>
          <button 
            onClick={() => navigate('/star-batch')}
            style={{
              background: '#334155', color: '#fff', border: 'none', padding: '0.75rem 1.5rem',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
            }}
          >
            <ArrowLeft size={18} /> Return to Star Batch
          </button>
        </div>
      </div>
    );
  }

  // Reconstruct active questions based on seenIndices
  const seenIndices = attempt.seenIndices || [];
  const activeQuestions = seenIndices.map(idx => {
    return { ...testData.questions[idx], originalIndex: idx };
  }).filter(q => q && q.text); // Filter out any undefined just in case

  // Map answers to the correct indexes expected by Mistake Analysis
  // attempt.responses is a map: { [questionIndexInActiveArray]: selectedOptionIndex }
  // TestAnalyticsDashboard expects `answers` to match the index of `activeQuestions`.
  const answers = attempt.responses || {};

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem' }}>
      <button 
        onClick={() => navigate('/star-batch')}
        style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem',
          fontSize: '0.9rem', padding: 0
        }}
      >
        <ArrowLeft size={16} /> Back to My Report Card
      </button>

      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.8rem', color: '#fff' }}>Historical Test Analysis</h1>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
          Attempt taken on {attempt.createdAt?.toDate ? attempt.createdAt.toDate().toLocaleString() : new Date(attempt.createdAt).toLocaleString()}
        </p>
      </div>

      <TestAnalyticsDashboard 
        result={{
          score: attempt.score,
          total: attempt.total,
          aiReview: attempt.aiReview,
          difficultyStats: attempt.difficultyStats || {},
          topicStats: attempt.topicStats || {}
        }}
        activeQuestions={activeQuestions}
        answers={answers}
      />
    </div>
  );
}
