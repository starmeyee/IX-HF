import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { matchStudent, isNameInClass } from '../auth/nameMatch';
import { getUserByPhone } from '../auth/authService';

const STEPS = {
  CHOOSE: 'choose',         // login or register?
  REGISTER: 'register',     // name + phone + roll
  REGISTER_OUTSIDER: 'register-outsider', // name + phone
  SET_PASS: 'set-pass',     // create password
  CREDENTIALS: 'creds',     // show "save your ID"
  LOGIN: 'login',           // phone + password
  FORGOT_SEND: 'otp-send',  // enter phone for OTP
  FORGOT_VERIFY: 'otp-verify', // enter OTP
  RESET_PASS: 'reset-pass', // set new password
};

export default function AuthModal() {
  const { modalOpen, closeModal, register, savePassword, login, sendOtp, verifyOtp, resetPassword } = useAuth();
  const [step, setStep] = useState(STEPS.CHOOSE);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [otp, setOtp] = useState('');
  const [otpPhone, setOtpPhone] = useState(''); // phone used in forgot flow

  if (!modalOpen) return null;

  function reset() {
    setStep(STEPS.CHOOSE);
    setErr(''); setName(''); setPhone(''); setRollNo('');
    setPassword(''); setPassword2(''); setOtp(''); setOtpPhone('');
  }

  function handleClose() { reset(); closeModal(); }

  async function handleRegister(e) {
    e.preventDefault();
    setErr('');
    const roll = parseInt(rollNo, 10);
    const student = matchStudent(name, roll);
    if (!student) {
      setErr('Name or roll number does not match our records. Check and try again.');
      return;
    }
    setBusy(true);
    try {
      const existing = await getUserByPhone(phone);
      if (existing) { setErr('This phone is already registered. Please login.'); return; }
      await register(name.trim(), phone.trim(), roll);
      setStep(STEPS.SET_PASS);
    } catch (ex) {
      setErr(ex.message);
    } finally { setBusy(false); }
  }

  async function handleRegisterOutsider(e) {
    e.preventDefault();
    setErr('');
    if (isNameInClass(name)) {
      setErr('Warning: You seem to be a student of this classroom. Please register as a student using your roll number instead.');
      return;
    }
    setBusy(true);
    try {
      const existing = await getUserByPhone(phone);
      if (existing) { setErr('This phone is already registered. Please login.'); return; }
      await register(name.trim(), phone.trim(), 0);
      setStep(STEPS.SET_PASS);
    } catch (ex) {
      setErr(ex.message);
    } finally { setBusy(false); }
  }

  async function handleSetPassword(e) {
    e.preventDefault();
    setErr('');
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (password !== password2) { setErr('Passwords do not match.'); return; }
    setBusy(true);
    try {
      await savePassword(phone.trim(), password);
      setStep(STEPS.CREDENTIALS);
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await login(phone.trim(), password);
      handleClose();
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  }

  async function handleSendOtp(e) {
    e.preventDefault();
    setErr('');
    if (!otpPhone.trim()) { setErr('Enter your registered phone number.'); return; }
    const user = await getUserByPhone(otpPhone.trim());
    if (!user) { setErr('No account found with this phone number.'); return; }
    setBusy(true);
    try {
      await sendOtp(otpPhone.trim());
      setStep(STEPS.FORGOT_VERIFY);
    } catch (ex) { setErr('Failed to send OTP. ' + ex.message); }
    finally { setBusy(false); }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await verifyOtp(otp.trim());
      setStep(STEPS.RESET_PASS);
    } catch (ex) { setErr('Invalid OTP. Try again.'); }
    finally { setBusy(false); }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setErr('');
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (password !== password2) { setErr('Passwords do not match.'); return; }
    setBusy(true);
    try {
      await resetPassword(otpPhone.trim(), password);
      handleClose();
    } catch (ex) { setErr(ex.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-overlay" onClick={handleClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={handleClose} aria-label="Close">✕</button>

        {step === STEPS.CHOOSE && (
          <div className="auth-step">
            <h2>Welcome to 10th HI</h2>
            <p className="auth-sub">Login or create your account</p>
            <button className="auth-btn primary" onClick={() => setStep(STEPS.LOGIN)}>Login</button>
            <button className="auth-btn secondary" onClick={() => setStep(STEPS.REGISTER)}>New here? Register as Student</button>
            <button className="auth-btn secondary" style={{marginTop: '0.5rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)'}} onClick={() => setStep(STEPS.REGISTER_OUTSIDER)}>Not a student? Register as Outsider</button>
          </div>
        )}

        {step === STEPS.REGISTER && (
          <form className="auth-step" onSubmit={handleRegister}>
            <h2>Create Student Account</h2>
            <p className="auth-sub">Enter your details exactly as on your ID card</p>
            <label>Full Name (as on ID)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aditya Gupta" required />
            <label>Phone Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" type="tel" maxLength={10} required />
            <label>Roll Number in Class</label>
            <input value={rollNo} onChange={(e) => setRollNo(e.target.value)} placeholder="1 – 40" type="number" min={1} max={40} required />
            {err && <p className="auth-err">{err}</p>}
            <button className="auth-btn primary" type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify & Continue'}</button>
            <button type="button" className="auth-link" onClick={() => { setErr(''); setStep(STEPS.CHOOSE); }}>← Back</button>
          </form>
        )}

        {step === STEPS.REGISTER_OUTSIDER && (
          <form className="auth-step" onSubmit={handleRegisterOutsider}>
            <h2>Outsider Registration</h2>
            <p className="auth-sub">Create an account to access shared materials</p>
            <label>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
            <label>Phone Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" type="tel" maxLength={10} required />
            {err && <p className="auth-err">{err}</p>}
            <button className="auth-btn primary" type="submit" disabled={busy}>{busy ? 'Processing…' : 'Continue'}</button>
            <button type="button" className="auth-link" onClick={() => { setErr(''); setStep(STEPS.CHOOSE); }}>← Back</button>
          </form>
        )}

        {step === STEPS.SET_PASS && (
          <form className="auth-step" onSubmit={handleSetPassword}>
            <h2>Set Your Password</h2>
            <p className="auth-sub">Choose a password you'll remember — you'll need it to login</p>
            <label>Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Min 6 characters" required />
            <label>Confirm Password</label>
            <input value={password2} onChange={(e) => setPassword2(e.target.value)} type="password" placeholder="Repeat password" required />
            {err && <p className="auth-err">{err}</p>}
            <button className="auth-btn primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Set Password'}</button>
          </form>
        )}

        {step === STEPS.CREDENTIALS && (
          <div className="auth-step">
            <div className="auth-success-icon">🎉</div>
            <h2>You're all set!</h2>
            <p className="auth-sub">Save your login details somewhere safe:</p>
            <div className="auth-creds-box">
              <p><strong>Login ID (Phone):</strong><br /><span className="auth-creds-value">{phone}</span></p>
              <p style={{ marginTop: '0.5rem' }}><strong>Password:</strong> the one you just set</p>
            </div>
            <p className="auth-sub" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Use this phone number + password to login next time.</p>
            <button className="auth-btn primary" onClick={handleClose}>Done — Go to App</button>
          </div>
        )}

        {step === STEPS.LOGIN && (
          <form className="auth-step" onSubmit={handleLogin}>
            <h2>Login</h2>
            <label>Phone Number (your login ID)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="10-digit mobile number" maxLength={10} required />
            <label>Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Your password" required />
            {err && <p className="auth-err">{err}</p>}
            <button className="auth-btn primary" type="submit" disabled={busy}>{busy ? 'Logging in…' : 'Login'}</button>
            <button type="button" className="auth-link" onClick={() => { setErr(''); setStep(STEPS.FORGOT_SEND); }}>Forgot password?</button>
            <button type="button" className="auth-link" onClick={() => { setErr(''); setStep(STEPS.CHOOSE); }}>← Back</button>
          </form>
        )}

        {step === STEPS.FORGOT_SEND && (
          <form className="auth-step" onSubmit={handleSendOtp}>
            <h2>Reset Password</h2>
            <p className="auth-sub">Enter your registered phone number. We'll send an OTP.</p>
            <label>Phone Number</label>
            <input value={otpPhone} onChange={(e) => setOtpPhone(e.target.value)} type="tel" placeholder="Your registered phone" maxLength={10} required />
            {err && <p className="auth-err">{err}</p>}
            <button className="auth-btn primary" type="submit" disabled={busy}>{busy ? 'Sending OTP…' : 'Send OTP'}</button>
            <button type="button" className="auth-link" onClick={() => { setErr(''); setStep(STEPS.LOGIN); }}>← Back to Login</button>
          </form>
        )}

        {step === STEPS.FORGOT_VERIFY && (
          <form className="auth-step" onSubmit={handleVerifyOtp}>
            <h2>Enter OTP</h2>
            <p className="auth-sub">We sent a 6-digit OTP to +91 {otpPhone}</p>
            <label>OTP</label>
            <input value={otp} onChange={(e) => setOtp(e.target.value)} type="text" placeholder="6-digit OTP" maxLength={6} required />
            {err && <p className="auth-err">{err}</p>}
            <button className="auth-btn primary" type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Verify OTP'}</button>
          </form>
        )}

        {step === STEPS.RESET_PASS && (
          <form className="auth-step" onSubmit={handleResetPassword}>
            <h2>New Password</h2>
            <label>New Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Min 6 characters" required />
            <label>Confirm New Password</label>
            <input value={password2} onChange={(e) => setPassword2(e.target.value)} type="password" placeholder="Repeat password" required />
            {err && <p className="auth-err">{err}</p>}
            <button className="auth-btn primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Password'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
