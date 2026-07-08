import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getStarBatchConfig, unlockStarBatchWithCode, getNextStarBatchRoll } from '../services/starBatchService';
import { getUserByPhone, registerUser } from '../auth/authService';
import { Sparkles, ArrowRight, ShieldCheck, User } from 'lucide-react';

export default function StarLogin() {
  const navigate = useNavigate();
  const { savePassword, login, updateCurrentUser, refreshUser } = useAuth();
  
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleStep1(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const config = await getStarBatchConfig();
      if (config.code !== code) {
        throw new Error("Invalid code.");
      }
      
      const existing = await getUserByPhone(phone.trim());
      if (existing) {
        setIsNewUser(false);
        setStep(2);
      } else {
        if (!name.trim()) throw new Error("Name is required for new users.");
        const rollNo = await getNextStarBatchRoll();
        await registerUser({ name: name.trim(), phone: phone.trim(), rollNo });
        setIsNewUser(true);
        setStep(2);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleStep2(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isNewUser) {
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        await savePassword(phone.trim(), password);
      } else {
        await login(phone.trim(), password);
      }
      
      // Update user document to mark unlocked — goes through the single unlock
      // function so both entry points share the same code-check + write logic.
      await unlockStarBatchWithCode(phone.trim(), code);
      await refreshUser(phone.trim()); // To ensure contextual user is updated
      updateCurrentUser({ hasUnlockedStarBatch: true });
      
      navigate('/star-batch');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="star-login-container">
      <style>{`
        .star-login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: #09090b; /* Very dark background */
          background-image: 
            radial-gradient(circle at 15% 50%, rgba(251, 191, 36, 0.05), transparent 25%),
            radial-gradient(circle at 85% 30%, rgba(251, 191, 36, 0.03), transparent 25%);
          font-family: 'Inter', system-ui, sans-serif;
        }
        
        .star-login-card {
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

        .star-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .star-icon-wrap {
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

        .star-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #fff;
          margin: 0 0 0.5rem;
          letter-spacing: -0.02em;
        }

        .star-subtitle {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.95rem;
          margin: 0;
        }

        .star-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .star-input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .star-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.7);
          margin-left: 0.25rem;
        }

        .star-input {
          width: 100%;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 1rem 1.25rem;
          color: #fff;
          font-size: 1rem;
          transition: all 0.2s ease;
          outline: none;
          box-sizing: border-box;
        }

        .star-input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }

        .star-input:focus {
          border-color: rgba(251, 191, 36, 0.5);
          background: rgba(0, 0, 0, 0.5);
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
        }
        
        .star-input.code-input {
          text-align: center;
          letter-spacing: 0.75rem;
          font-size: 1.25rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .star-btn {
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
          margin-top: 0.5rem;
          box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.3);
        }

        .star-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px -5px rgba(245, 158, 11, 0.4);
        }

        .star-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .star-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          filter: grayscale(0.5);
        }

        .star-error {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          font-size: 0.85rem;
          text-align: center;
          border: 1px solid rgba(239, 68, 68, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .star-back-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.9rem;
          cursor: pointer;
          margin-top: 1rem;
          transition: color 0.2s;
        }
        
        .star-back-btn:hover {
          color: #fff;
        }
      `}</style>

      <div className="star-login-card">
        <div className="star-header">
          <div className="star-icon-wrap">
            <Sparkles size={28} color="#fbbf24" strokeWidth={2.5} />
          </div>
          <h2 className="star-title">Elite Access</h2>
          <p className="star-subtitle">Star Batch Portal Authentication</p>
        </div>

        {step === 1 && (
          <form className="star-form" onSubmit={handleStep1}>
            <div className="star-input-group">
              <label className="star-label">Phone Number</label>
              <input 
                type="tel" 
                className="star-input" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                maxLength={10} 
                required 
                autoFocus 
                placeholder="10-digit mobile number" 
              />
            </div>
            
            <div className="star-input-group">
              <label className="star-label">Full Name (If new user)</label>
              <input 
                type="text" 
                className="star-input" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Your full name" 
              />
            </div>
            
            <div className="star-input-group">
              <label className="star-label">Access Code</label>
              <input 
                type="text" 
                className="star-input code-input" 
                value={code} 
                onChange={e => setCode(e.target.value)} 
                maxLength={4} 
                required 
                placeholder="••••" 
                autoComplete="off"
              />
            </div>
            
            {error && <div className="star-error">
              <ShieldCheck size={16} /> {error}
            </div>}
            
            <button type="submit" className="star-btn" disabled={busy}>
              {busy ? 'Authenticating...' : 'Continue'} <ArrowRight size={18} />
            </button>
          </form>
        )}

        {step === 2 && (
          <form className="star-form" onSubmit={handleStep2}>
            <div style={{ textAlign: 'center', marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={14} color="#fbbf24" />
                <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 500 }}>{phone}</span>
              </div>
              <p className="star-subtitle" style={{ fontSize: '0.85rem' }}>
                {isNewUser ? 'Create a secure password for your new account.' : 'Welcome back. Please enter your password.'}
              </p>
            </div>

            <div className="star-input-group">
              <label className="star-label">{isNewUser ? 'Create Password' : 'Password'}</label>
              <input 
                type="password" 
                className="star-input" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                autoFocus 
                placeholder={isNewUser ? 'Minimum 6 characters' : 'Your password'} 
              />
            </div>

            {isNewUser && (
              <div className="star-input-group">
                <label className="star-label">Confirm Password</label>
                <input 
                  type="password" 
                  className="star-input" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  required 
                  placeholder="Type password again" 
                />
              </div>
            )}
            
            {error && <div className="star-error">
              <ShieldCheck size={16} /> {error}
            </div>}
            
            <button type="submit" className="star-btn" disabled={busy}>
              {busy ? (isNewUser ? 'Setting up...' : 'Verifying...') : (isNewUser ? 'Create Account' : 'Secure Login')} <ArrowRight size={18} />
            </button>
            
            <button type="button" className="star-back-btn" onClick={() => { setError(''); setStep(1); }}>
              ← Use a different account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
