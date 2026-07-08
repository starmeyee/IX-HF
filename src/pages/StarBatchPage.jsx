import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { unlockStarBatchWithCode } from '../services/starBatchService';
import { getAttendance, setAttendance } from '../auth/authService';
import { getClosedDays } from '../services/calendarOverrideService';
import AttendanceCalendar from '../components/AttendanceCalendar';
import { Lock, Star, Sparkles, ChevronRight, CalendarCheck, GraduationCap, CalendarHeart } from 'lucide-react';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

export default function StarBatchPage() {
  const { currentUser, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const lockTimerRef = useRef(null);
  const attendanceRef = useRef(null);

  // Attendance state — same pattern as StudentDashboard, scoped to this user.
  const [absentDays, setAbsentDays] = useState([]);
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);
  const [closedDays, setClosedDays] = useState([]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  useEffect(() => () => clearTimeout(lockTimerRef.current), []);

  // Load attendance + closed days once unlocked.
  useEffect(() => {
    if (!currentUser?.hasUnlockedStarBatch) return;
    let cancelled = false;
    Promise.all([getAttendance(currentUser.phone), getClosedDays()]).then(([days, closed]) => {
      if (cancelled) return;
      setAbsentDays(days);
      setClosedDays(closed);
      setAttendanceLoaded(true);
    }).catch(() => {
      if (!cancelled) setAttendanceLoaded(true);
    });
    return () => { cancelled = true; };
  }, [currentUser?.hasUnlockedStarBatch, currentUser?.phone]);

  // Scroll to the attendance section if the URL includes the #attendance anchor
  // (used by the Navbar's "Attendance" link for external users).
  useEffect(() => {
    if (window.location.hash === '#attendance' && attendanceRef.current) {
      attendanceRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentUser?.hasUnlockedStarBatch]);

  const handleToggleAttendance = useCallback(async (dateKey) => {
    if (!currentUser) return;
    setAbsentDays(prev => {
      const next = prev.includes(dateKey) ? prev.filter(d => d !== dateKey) : [...prev, dateKey];
      setAttendance(currentUser.phone, next).catch(() => {});
      return next;
    });
  }, [currentUser]);

  if (!currentUser) return null;

  async function handleUnlock(e) {
    e.preventDefault();
    if (isLocked) return;
    setError('');
    setLoading(true);
    try {
      await unlockStarBatchWithCode(currentUser.phone, code);
      updateCurrentUser({ hasUnlockedStarBatch: true });
    } catch (err) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      if (nextAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true);
        setError(`Too many incorrect attempts. Try again in ${Math.ceil(LOCKOUT_MS / 1000)}s.`);
        lockTimerRef.current = setTimeout(() => {
          setIsLocked(false);
          setAttempts(0);
        }, LOCKOUT_MS);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(e) {
    // Restrict to digits only, max 4 chars — code is numeric by convention.
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCode(digitsOnly);
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
                inputMode="numeric"
                pattern="[0-9]*"
                className="star-unlock-input"
                placeholder="••••"
                value={code}
                onChange={handleCodeChange}
                maxLength={4}
                required
                autoComplete="off"
                disabled={isLocked}
              />
            </div>
            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {error}
              </div>
            )}
            <button type="submit" className="star-unlock-btn" disabled={loading || isLocked || code.length !== 4}>
              {loading ? 'Verifying...' : isLocked ? 'Locked' : 'Unlock Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard" style={{ animation: 'fade-in 0.4s ease' }}>
      <style>{`
        .star-quick-link:hover { border-color: rgba(251, 191, 36, 0.4); }
      `}</style>
      <div style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', padding: '2rem', borderRadius: 'var(--radius-lg)', color: '#fff', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', boxShadow: '0 8px 30px rgba(245, 158, 11, 0.3)' }}>
        <Sparkles size={40} />
        <div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', fontWeight: 800 }}>Elite Star Batch</h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '1.05rem' }}>Welcome to the exclusive portal. Aiming for 85%+ excellence.</p>
        </div>
      </div>

      <div
        className="as-card star-quick-link"
        onClick={() => navigate('/star-syllabus')}
        style={{ cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}
      >
        <div>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Star size={20} color="#fbbf24" /> Elite Syllabus &amp; Questions
          </h3>
          <p className="as-muted" style={{ margin: 0 }}>Browse sections, subjects &amp; chapters. Add targeted questions per chapter.</p>
        </div>
        <ChevronRight size={22} color="#fbbf24" style={{ flexShrink: 0, marginLeft: '1rem' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div
          className="as-card star-quick-link"
          onClick={() => navigate('/study-together')}
          style={{ cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <GraduationCap size={22} color="#fbbf24" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Study Together</h4>
            <p className="as-muted" style={{ margin: 0, fontSize: '0.8rem' }}>Join a live study room</p>
          </div>
        </div>
        <div
          className="as-card star-quick-link"
          onClick={() => navigate('/holidays')}
          style={{ cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <CalendarHeart size={22} color="#fbbf24" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>Holiday Homework</h4>
            <p className="as-muted" style={{ margin: 0, fontSize: '0.8rem' }}>View and track assignments</p>
          </div>
        </div>
      </div>

      <div ref={attendanceRef} className="as-card" style={{ padding: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <CalendarCheck size={20} color="#fbbf24" /> Your Attendance
        </h3>
        {!attendanceLoaded ? (
          <p className="as-muted">Loading attendance...</p>
        ) : (
          <AttendanceCalendar
            absentDays={absentDays}
            onToggle={handleToggleAttendance}
            closedDays={closedDays}
          />
        )}
      </div>
    </div>
  );
}
