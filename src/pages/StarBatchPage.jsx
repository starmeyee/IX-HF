import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { unlockStarBatch } from '../services/starBatchService';
import { Lock, Star, Sparkles } from 'lucide-react';

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '1rem' }}>
        <div className="auth-modal" style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
              <Lock size={32} color="#fbbf24" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Star Batch Access</h2>
            <p className="as-muted" style={{ fontSize: '0.9rem' }}>Enter the 4-digit secret code to unlock the Elite Star Batch portal.</p>
          </div>

          <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <input
                type="text"
                className="auth-input"
                placeholder="4-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={4}
                required
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: '600' }}
              />
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>{error}</p>}
            <button type="submit" className="auth-btn primary" disabled={loading}>
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
          <Star size={20} color="#fbbf24" /> Exclusive Material
        </h3>
        <p className="as-muted">This area is isolated from the main portal. High-level resources and targeted tests will appear here.</p>
      </div>
    </div>
  );
}
