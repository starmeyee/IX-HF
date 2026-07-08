import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { unlockStarBatch } from '../services/starBatchService';
import { Lock, Star, Sparkles } from 'lucide-react';
import StarBatchSyllabus from '../components/StarBatchSyllabus';

export default function StarBatchPage() {
  const { currentUser, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  async function handleUnlock(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await unlockStarBatch(currentUser.phone, code);
      updateCurrentUser({ hasUnlockedStarBatch: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!currentUser.hasUnlockedStarBatch) {
    return (
      <div className="star-unlock-container">
        <style>{`
          .star-unlock-container {
            min-height: 80vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            background: #09090b;
            background-image: 
              radial-gradient(circle at 50% 0%, rgba(251, 191, 36, 0.05), transparent 40%),
              radial-gradient(circle at 50% 100%, rgba(251, 191, 36, 0.03), transparent 40%);
            border-radius: var(--radius-lg);
            margin: 1rem;
          }
          
          .star-unlock-card {
            width: 100%;
            max-width: 420px;
            background: rgba(255, 255, 255, 0.02);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 24px;
            padding: 2.5rem 2rem;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4), 
                        inset 0 1px 0 rgba(255, 255, 255, 0.05);
            animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          }
  
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
  
          .star-unlock-header {
            text-align: center;
            margin-bottom: 2rem;
          }
  
          .star-unlock-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%);
            border: 1px solid rgba(251, 191, 36, 0.2);
            margin-bottom: 1.25rem;
            box-shadow: 0 0 30px rgba(251, 191, 36, 0.1);
          }
  
          .star-unlock-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: #fff;
            margin: 0 0 0.5rem;
            letter-spacing: -0.02em;
          }
  
          .star-unlock-subtitle {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.95rem;
            margin: 0;
            line-height: 1.4;
          }
  
          .star-unlock-input {
            width: 100%;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            padding: 1rem 1.25rem;
            color: #fff;
            font-size: 1.5rem;
            font-weight: 600;
            letter-spacing: 0.75rem;
            text-align: center;
            transition: all 0.2s ease;
            outline: none;
            box-sizing: border-box;
          }
  
          .star-unlock-input:focus {
            border-color: rgba(251, 191, 36, 0.5);
            background: rgba(0, 0, 0, 0.5);
            box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
          }
  
          .star-unlock-btn {
            width: 100%;
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: #000;
            border: none;
            border-radius: 14px;
            padding: 1.1rem;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            transition: all 0.2s ease;
            box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.3);
          }
  
          .star-unlock-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 15px 30px -5px rgba(245, 158, 11, 0.4);
          }
  
          .star-unlock-btn:active:not(:disabled) {
            transform: translateY(0);
          }
  
          .star-unlock-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            filter: grayscale(0.5);
          }
        `}</style>
  
        <div className="star-unlock-card">
          <div className="star-unlock-header">
            <div className="star-unlock-icon">
              <Lock size={28} color="#fbbf24" strokeWidth={2.5} />
            </div>
            <h2 className="star-unlock-title">Star Batch Access</h2>
            <p className="star-unlock-subtitle">Enter the 4-digit secret code to unlock the Elite Star Batch portal.</p>
          </div>
  
          <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <input
                type="text"
                className="star-unlock-input"
                placeholder="••••"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={4}
                required
                autoComplete="off"
              />
            </div>
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {error}
              </div>
            )}
            <button type="submit" className="star-unlock-btn" disabled={loading}>
              {loading ? 'Verifying...' : 'Unlock Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard" style={{ animation: 'fade-in 0.4s ease' }}>
      <div style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', padding: '2rem', borderRadius: 'var(--radius-lg)', color: '#fff', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', boxShadow: '0 8px 30px rgba(245, 158, 11, 0.3)' }}>
        <Sparkles size={40} />
        <div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', fontWeight: 800 }}>Elite Star Batch</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1.05rem' }}>Welcome to the exclusive portal. Aiming for 85%+ excellence.</p>
        </div>
      </div>
      
      <div className="as-card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Star size={20} color="#fbbf24" /> Elite Syllabus & Questions
        </h3>
        <p className="as-muted">This area is isolated from the main portal. Add high-level topics and questions for each chapter below.</p>
        <StarBatchSyllabus />
      </div>
    </div>
  );
}
