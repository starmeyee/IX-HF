import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { TEST_PHONE } from '../auth/roles';
import { matchStudent } from '../auth/nameMatch';
import { getUserByPhone } from '../auth/authService';
import { sendEmailLink } from '../firebase';
import { getTeachers } from '../services/teacherService';
import { GraduationCap, User } from 'lucide-react';

const S = {
  PICK:         'pick',          // student or teacher?
  // --- student ---
  PHONE:        'phone',         // enter phone → detect new/existing
  REGISTER:     'register',      // name + roll
  SET_PASS:     'set-pass',      // create password
  DONE:         'done',          // success screen
  LOGIN:        'login',         // phone + password
  FORGOT_SEND:  'otp-send',      // enter phone → send email link
  RESET_PASS:   'reset-pass',    // new password (after email link)
  // --- teacher ---
  TEACHER_LOGIN: 'teacher-login',
};

// Progress dots for student registration
function Dots({ step }) {
  const steps = [S.REGISTER, S.SET_PASS, S.DONE];
  const idx = steps.indexOf(step);
  if (idx === -1) return null;
  return (
    <div className="auth-dots">
      {steps.map((_, i) => (
        <span key={i} className={`auth-dot ${i <= idx ? 'active' : ''}`} />
      ))}
    </div>
  );
}

export default function AuthModal({ resetPhone, onResetConsumed }) {
  const {
    modalOpen, closeModal,
    register, savePassword, login, resetPassword,
    loginTeacherCtx,
  } = useAuth();
  const navigate = useNavigate();

  function consumeRedirect() {
    const path = sessionStorage.getItem('redirect_after_login');
    if (path) { sessionStorage.removeItem('redirect_after_login'); navigate(path); }
  }

  const [step, setStep]         = useState(S.PICK);
  const [err, setErr]           = useState('');
  const [busy, setBusy]         = useState(false);
  const [teachers, setTeachers] = useState([]);

  // student fields
  const [phone,     setPhone]     = useState('');
  const [name,      setName]      = useState('');
  const [rollNo,    setRollNo]    = useState('');
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [otpPhone,  setOtpPhone]  = useState(''); // phone used for reset

  // teacher fields
  const [teacherId, setTeacherId] = useState('');
  const [tPassword, setTPassword] = useState('');

  // When App.jsx detects a reset email link, open the modal at RESET_PASS
  useEffect(() => {
    if (resetPhone) {
      setOtpPhone(resetPhone);
      setStep(S.RESET_PASS);
      onResetConsumed?.();
    }
  }, [resetPhone]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === S.TEACHER_LOGIN && teachers.length === 0) {
      getTeachers().then(setTeachers).catch(() => {});
    }
  }, [step]);

  if (!modalOpen && step !== S.RESET_PASS) return null;

  function reset() {
    setStep(S.PICK); setErr('');
    setPhone(''); setName(''); setRollNo('');
    setPassword(''); setPassword2(''); setOtpPhone('');
    setTeacherId(''); setTPassword('');
  }

  function handleClose() { reset(); closeModal(); }

  // ── STUDENT: phone probe ──────────────────────────────────
  async function handlePhone(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const existing = await getUserByPhone(phone.trim());
      if (existing) setStep(S.LOGIN);
      else setStep(S.REGISTER);
    } catch { setErr('Connection error. Try again.'); }
    finally { setBusy(false); }
  }

  // ── STUDENT: register ────────────────────────────────────
  async function handleRegister(e) {
    e.preventDefault(); setErr('');
    const roll = parseInt(rollNo, 10);
    if (phone.trim() !== TEST_PHONE && !matchStudent(name, roll)) {
      setErr('Name or roll number doesn\'t match our records. Check and try again.');
      return;
    }
    setBusy(true);
    try {
      await register(name.trim(), phone.trim(), roll);
      setStep(S.SET_PASS);
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  }

  // ── STUDENT: set password ────────────────────────────────
  async function handleSetPassword(e) {
    e.preventDefault(); setErr('');
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (password !== password2) { setErr('Passwords do not match.'); return; }
    setBusy(true);
    try {
      await savePassword(phone.trim(), password);
      consumeRedirect();
      setStep(S.DONE);
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  }

  // ── STUDENT: login ────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await login(phone.trim(), password);
      consumeRedirect();
      handleClose();
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  }

  // ── STUDENT: forgot password — send email reset link ─────────
  async function handleSendResetLink(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const user = await getUserByPhone(otpPhone.trim());
      if (!user) { setErr('No account found with this phone number.'); setBusy(false); return; }
      if (!user.email || !user.emailVerified) {
        setErr('No verified email on this account. Add one in your Profile page first.');
        setBusy(false); return;
      }
      await sendEmailLink(user.email, 'reset', user.phone);
      setStep('reset-link-sent');
    } catch (ex) {
      setErr('Failed to send link: ' + ex.message);
    } finally {
      setBusy(false);
    }
  }


  async function handleResetPassword(e) {
    e.preventDefault(); setErr('');
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (password !== password2) { setErr('Passwords do not match.'); return; }
    setBusy(true);
    try {
      await resetPassword(otpPhone.trim(), password);
      handleClose();
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  }

  // ── TEACHER: login ────────────────────────────────────────
  async function handleTeacherLogin(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await loginTeacherCtx(teacherId, tPassword);
      consumeRedirect();
      handleClose();
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-overlay" onClick={handleClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={handleClose} aria-label="Close">✕</button>

        {/* ── PICK ── */}
        {step === S.PICK && (
          <div className="auth-step">
            <h2>Welcome to IX HF</h2>
            <p className="auth-sub">Select how you want to continue</p>
            <div className="auth-pick-grid">
              <button className="auth-pick-card" onClick={() => setStep(S.PHONE)}>
                <User size={28} />
                <span>Student</span>
              </button>
              <button className="auth-pick-card" onClick={() => setStep(S.TEACHER_LOGIN)}>
                <GraduationCap size={28} />
                <span>Teacher</span>
              </button>
            </div>
          </div>
        )}

        {/* ── PHONE PROBE ── */}
        {step === S.PHONE && (
          <form className="auth-step" onSubmit={handlePhone}>
            <h2>Student Login</h2>
            <p className="auth-sub">Enter your phone number to continue</p>
            <label>Phone Number</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              type="tel" placeholder="10-digit mobile number" maxLength={10} required autoFocus />
            {err && <p className="auth-err">{err}</p>}
            <button className="auth-btn primary" type="submit" disabled={busy}>
              {busy ? 'Checking…' : 'Continue →'}
            </button>
            <button type="button" className="auth-link" onClick={() => { setErr(''); setStep(S.PICK); }}>← Back</button>
          </form>
        )}

        {/* ── REGISTER ── */}
        {step === S.REGISTER && (
          <form className="auth-step" onSubmit={handleRegister}>
            <Dots step={S.REGISTER} />
            <h2>Create Account</h2>
            <p className="auth-sub">Enter your details exactly as on your ID card</p>
            <label>Full Name (as on ID)</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Aditya Gupta" required autoFocus />
            <label>Roll Number</label>
            <input value={rollNo} onChange={e => setRollNo(e.target.value)}
              placeholder="1 – 40" type="number" min={1} max={40} required />
            <p className="auth-sub" style={{ fontSize: '0.78rem', marginTop: '-0.25rem' }}>
              Phone: {phone} · <button type="button" className="auth-link" style={{ fontSize: '0.78rem' }} onClick={() => setStep(S.PHONE)}>Change</button>
            </p>
            {err && <p className="auth-err">{err}</p>}
            <button className="auth-btn primary" type="submit" disabled={busy}>
              {busy ? 'Verifying…' : 'Verify & Continue'}
            </button>
            <button type="button" className="auth-link"
              onClick={() => { setErr(''); setStep(S.LOGIN); }}>
              Already have an account? Login
            </button>
          </form>
        )}

        {/* ── SET PASSWORD ── */}
        {step === S.SET_PASS && (
          <form className="auth-step" onSubmit={handleSetPassword}>
            <Dots step={S.SET_PASS} />
            <h2>Set Your Password</h2>
            <p className="auth-sub">Choose a password you'll remember</p>
            <label>Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)}
              type="password" placeholder="Min 6 characters" required autoFocus />
            <label>Confirm Password</label>
            <input value={password2} onChange={e => setPassword2(e.target.value)}
              type="password" placeholder="Repeat password" required />
            {err && <p className="auth-err">{err}</p>}
            <button className="auth-btn primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Set Password'}
            </button>
          </form>
        )}

        {/* ── DONE ── */}
        {step === S.DONE && (
          <div className="auth-step">
            <Dots step={S.DONE} />
            <div className="auth-success-icon">🎉</div>
            <h2>You're all set!</h2>
            <p className="auth-sub">Save your login details:</p>
            <div className="auth-creds-box">
              <p><strong>Phone:</strong> {phone}</p>
              <p style={{ marginTop: '0.4rem' }}><strong>Password:</strong> the one you just set</p>
            </div>
            <button className="auth-btn primary" onClick={handleClose}>Go to App</button>
          </div>
        )}

        {/* ── LOGIN ── */}
        {step === S.LOGIN && (
          <form className="auth-step" onSubmit={handleLogin}>
            <h2>Welcome back</h2>
            <label>Phone Number</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              type="tel" placeholder="10-digit mobile number" maxLength={10} required autoFocus />
            <label>Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)}
              type="password" placeholder="Your password" required />
            {err && <p className="auth-err">{err}</p>}
            <button className="auth-btn primary" type="submit" disabled={busy}>
              {busy ? 'Logging in…' : 'Login'}
            </button>
            <button type="button" className="auth-link"
              onClick={() => { setErr(''); setStep(S.FORGOT_SEND); }}>
              Forgot password?
            </button>
            <button type="button" className="auth-link"
              onClick={() => { setErr(''); setStep(S.REGISTER); }}>
              New here? Register
            </button>
            <button type="button" className="auth-link"
              onClick={() => { setErr(''); setStep(S.PICK); }}>← Back</button>
          </form>
        )}

        {/* ── FORGOT SEND ── */}
        {step === S.FORGOT_SEND && (
          <form className="auth-step" onSubmit={handleSendResetLink}>
            <h2>Reset Password</h2>
            <p className="auth-sub">Enter your registered phone number. A reset link will be sent to your verified email.</p>
            <label>Phone Number</label>
            <input value={otpPhone} onChange={e => setOtpPhone(e.target.value)}
              type="tel" placeholder="Your registered phone" maxLength={10} required autoFocus />
            {err && <p className="auth-err">{err}</p>}
            <button className="auth-btn primary" type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send Reset Link'}
            </button>
            <button type="button" className="auth-link"
              onClick={() => { setErr(''); setStep(S.LOGIN); }}>← Back to Login</button>
          </form>
        )}

        {/* ── RESET LINK SENT ── */}
        {step === 'reset-link-sent' && (
          <div className="auth-step">
            <div className="auth-success-icon">📧</div>
            <h2>Check your email</h2>
            <p className="auth-sub">We sent a password reset link to your verified email. Click it to set a new password.</p>
            <p className="auth-sub" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>
              Don't see it? Check your <strong>spam / junk folder</strong>.
            </p>
            <button className="auth-btn secondary" onClick={handleClose}>Close</button>
          </div>
        )}

        {/* ── RESET PASSWORD ── */}
        {step === S.RESET_PASS && (
          <form className="auth-step" onSubmit={handleResetPassword}>
            <h2>New Password</h2>
            <p className="auth-sub">Set a new password for your account.</p>
            <label>New Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)}
              type="password" placeholder="Min 6 characters" required autoFocus />
            <label>Confirm Password</label>
            <input value={password2} onChange={e => setPassword2(e.target.value)}
              type="password" placeholder="Repeat password" required />
            {err && <p className="auth-err">{err}</p>}
            <button className="auth-btn primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save Password'}
            </button>
          </form>
        )}

        {/* ── TEACHER LOGIN ── */}
        {step === S.TEACHER_LOGIN && (
          <form className="auth-step" onSubmit={handleTeacherLogin}>
            <h2>Teacher Login</h2>
            <p className="auth-sub">Select your name and enter your password</p>
            <label>Select Teacher</label>
            <select
              className="auth-input"
              value={teacherId}
              onChange={e => setTeacherId(e.target.value)}
              required
            >
              <option value="">— Select your name —</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.subject} · {t.period}
                </option>
              ))}
            </select>
            {teacherId && (() => {
              const t = teachers.find(x => x.id === teacherId);
              return t ? (
                <div className="auth-teacher-preview">
                  <strong>{t.name}</strong>
                  <span>{t.subject} · {t.period}</span>
                </div>
              ) : null;
            })()}
            <label>Password</label>
            <input value={tPassword} onChange={e => setTPassword(e.target.value)}
              type="password" placeholder="Your password" required />
            {err && <p className="auth-err">{err}</p>}
            <button className="auth-btn primary" type="submit" disabled={busy || !teacherId}>
              {busy ? 'Logging in…' : 'Login'}
            </button>
            <p className="auth-sub" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Don't know your password?{' '}
              <a
                href="https://wa.me/918102783645"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#25D366', fontWeight: 600 }}
              >
                Contact Utkarsh on WhatsApp
              </a>
            </p>
            <button type="button" className="auth-link"
              onClick={() => { setErr(''); setStep(S.PICK); }}>← Back</button>
          </form>
        )}

      </div>
    </div>
  );
}
