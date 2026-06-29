import { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Camera, ShieldAlert, ShieldCheck, User as UserIcon, Users, Mail, CheckCircle, Clock, FlaskConical } from 'lucide-react';
import { ROLES, TEST_PHONE } from '../auth/roles';
import { saveEmail, setTestAccountRole, resetTestAccount } from '../auth/authService';
import { sendEmailLink } from '../firebase';
import packageJson from '../../package.json';

export default function ProfilePage() {
  const { currentUser, loading, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileRef = useRef();
  const [photo, setPhoto] = useState(null);
  const [loadedPhotoForPhone, setLoadedPhotoForPhone] = useState(null);

  // Email section state
  const [emailInput, setEmailInput] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  // Show success toast when returning from verification link
  const [verifiedToast, setVerifiedToast] = useState(location.state?.emailVerified || false);
  useEffect(() => {
    if (verifiedToast) {
      const t = setTimeout(() => setVerifiedToast(false), 4000);
      return () => clearTimeout(t);
    }
  }, [verifiedToast]);

  useEffect(() => {
    if (!loading && !currentUser) navigate('/');
  }, [currentUser, loading, navigate]);

  const isTeacher = currentUser?.role === ROLES.TEACHER;
  const identifier = isTeacher ? currentUser?.id : currentUser?.phone;
  const isTestAccount = currentUser?.phone === TEST_PHONE;
  const [testRoleBusy, setTestRoleBusy] = useState(false);
  const [testMsg, setTestMsg] = useState('');

  async function handleSwitchRole(role) {
    setTestRoleBusy(true); setTestMsg('');
    try {
      await setTestAccountRole(role);
      await refreshUser(TEST_PHONE);
      setTestMsg(`✓ Switched to ${role}`);
    } catch (e) { setTestMsg('Failed: ' + e.message); }
    finally { setTestRoleBusy(false); }
  }

  async function handleResetAccount() {
    if (!window.confirm('Reset test account? This clears email, attendance, homework, onboarding and resets role to STUDENT.')) return;
    setTestRoleBusy(true); setTestMsg('');
    try {
      await resetTestAccount();
      await refreshUser(TEST_PHONE);
      setTestMsg('✓ Account reset to clean state.');
    } catch (e) { setTestMsg('Failed: ' + e.message); }
    finally { setTestRoleBusy(false); }
  }

  if (currentUser && loadedPhotoForPhone !== identifier) {
    setLoadedPhotoForPhone(identifier);
    setPhoto(localStorage.getItem(`photo_${identifier}`) || null);
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result;
      setPhoto(b64);
      localStorage.setItem(`photo_${identifier}`, b64);
    };
    reader.readAsDataURL(file);
  }

  function getInitials(name) {
    const parts = name.trim().split(' ');
    return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0]).toUpperCase();
  }

  async function handleAddEmail(e) {
    e.preventDefault();
    if (!emailInput.includes('@')) { setEmailMsg('Enter a valid email address.'); return; }
    setEmailBusy(true); setEmailMsg('');
    try {
      await saveEmail(currentUser.phone, emailInput.trim());
      await sendEmailLink(emailInput.trim(), 'verify');
      await refreshUser(currentUser.phone);
      setEmailMsg('✓ Verification link sent! Check your inbox and click the link.');
      setShowEmailForm(false);
    } catch (err) {
      setEmailMsg('Failed to send link: ' + err.message);
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleResendVerification() {
    if (!currentUser.email) return;
    setEmailBusy(true); setEmailMsg('');
    try {
      await sendEmailLink(currentUser.email, 'verify');
      setEmailMsg('✓ Verification link resent! Check your inbox.');
    } catch (err) {
      setEmailMsg('Failed: ' + err.message);
    } finally {
      setEmailBusy(false);
    }
  }

  if (!currentUser) return null;

  const maskedPhone = isTeacher
    ? currentUser.id
    : currentUser.phone?.replace(/(\d{2})\d{6}(\d{2})/, '$1XXXXXX$2') ?? '—';

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar-wrap" onClick={() => fileRef.current.click()} title="Change photo">
          {photo
            ? <img src={photo} alt="profile" className="profile-photo" />
            : <div className="profile-initials">{getInitials(currentUser.name)}</div>
          }
          <div className="profile-camera-overlay"><Camera size={18} /></div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
        </div>

        <h2 className="profile-name">{currentUser.name}</h2>
        <p className="profile-roll">
          {isTeacher
            ? `${currentUser.subject} · ${currentUser.period}`
            : currentUser.rollNo === 0 ? 'Outsider Account' : `Class 10th HI · Roll No. ${currentUser.rollNo}`}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
          {currentUser.role === ROLES.ADMIN && <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}><ShieldAlert size={14} style={{ marginRight: 4 }} /> ADMIN</span>}
          {currentUser.role === ROLES.MONITOR && <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}><ShieldCheck size={14} style={{ marginRight: 4 }} /> MONITOR</span>}
          {currentUser.role === ROLES.STUDENT && <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}><UserIcon size={14} style={{ marginRight: 4 }} /> STUDENT</span>}
          {currentUser.role === ROLES.OUTSIDER && <span className="badge" style={{ background: 'rgba(168, 162, 158, 0.1)', color: '#a8a29e', border: '1px solid rgba(168, 162, 158, 0.3)' }}><Users size={14} style={{ marginRight: 4 }} /> OUTSIDER</span>}
          {isTeacher && <span className="badge teacher-chip">TEACHER</span>}
        </div>

        <div className="profile-info-grid">
          <div className="profile-info-item">
            <span className="profile-info-label">{isTeacher ? 'Teacher ID' : 'Login ID (Phone)'}</span>
            <span className="profile-info-value">{maskedPhone}</span>
          </div>
          {isTeacher ? (
            <div className="profile-info-item">
              <span className="profile-info-label">Period</span>
              <span className="profile-info-value">{currentUser.period}</span>
            </div>
          ) : (
            <div className="profile-info-item">
              <span className="profile-info-label">{currentUser.rollNo === 0 ? 'Account Type' : 'Roll Number'}</span>
              <span className="profile-info-value">{currentUser.rollNo === 0 ? 'Outsider' : currentUser.rollNo}</span>
            </div>
          )}
          {!isTeacher && (
            <div className="profile-info-item">
              <span className="profile-info-label">Registered</span>
              <span className="profile-info-value">{currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-IN') : '—'}</span>
            </div>
          )}
        </div>

        <p className="profile-photo-hint">Tap the photo to change it. Stored on this device only.</p>

        {/* ── Email Section — students only ── */}
        {!isTeacher && (
        <div className="profile-email-section">
          {verifiedToast && (
            <div className="profile-email-toast">
              <CheckCircle size={15} /> Email verified successfully!
            </div>
          )}

          <div className="profile-email-card">
            <div className="profile-email-header">
              <Mail size={15} />
              <span>Recovery Email</span>
            </div>

            {currentUser.email && currentUser.emailVerified ? (
              <div className="profile-email-row">
                <span className="profile-email-addr">
                  {currentUser.email.replace(/(.{2}).*(@.*)/, '$1…$2')}
                </span>
                <span className="profile-email-badge verified">
                  <CheckCircle size={12} /> Verified
                </span>
              </div>
            ) : currentUser.email && !currentUser.emailVerified ? (
              <>
                <div className="profile-email-row">
                  <span className="profile-email-addr">
                    {currentUser.email.replace(/(.{2}).*(@.*)/, '$1…$2')}
                  </span>
                  <span className="profile-email-badge pending">
                    <Clock size={12} /> Pending
                  </span>
                </div>
                <p className="profile-email-hint">
                  Check your inbox (and <strong>spam folder</strong>) for the verification link.
                </p>
                <button type="button" className="profile-email-resend"
                  onClick={handleResendVerification} disabled={emailBusy}>
                  {emailBusy ? 'Sending…' : 'Resend verification link'}
                </button>
                {emailMsg && <p className="profile-email-msg">{emailMsg}</p>}
              </>
            ) : showEmailForm ? (
              <form onSubmit={handleAddEmail} className="profile-email-form">
                <input
                  type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)}
                  placeholder="your@email.com" required autoFocus
                  className="profile-email-input"
                />
                <p className="profile-email-hint">
                  A verification link will be sent to this email. Check your <strong>spam folder</strong> if you don't see it.
                </p>
                <div className="profile-email-actions">
                  <button className="auth-btn primary" type="submit" disabled={emailBusy}
                    style={{ flex: 1, fontSize: '0.875rem' }}>
                    {emailBusy ? 'Sending…' : 'Send verification link'}
                  </button>
                  <button type="button" className="auth-btn secondary"
                    onClick={() => { setShowEmailForm(false); setEmailMsg(''); }}
                    style={{ fontSize: '0.875rem' }}>
                    Cancel
                  </button>
                </div>
                {emailMsg && <p className="profile-email-msg">{emailMsg}</p>}
              </form>
            ) : (
              <>
                <p className="profile-email-hint" style={{ marginBottom: '0.6rem' }}>
                  Used to reset your password if you forget it.
                </p>
                <button type="button" className="profile-email-resend"
                  onClick={() => setShowEmailForm(true)}>
                  + Add email address
                </button>
              </>
            )}
          </div>
        </div>
        )}

        {/* ── Test Account Role Switcher ── */}
        {isTestAccount && (
          <div className="profile-email-section">
            <div className="profile-email-card">
              <div className="profile-email-header">
                <FlaskConical size={15} />
                <span>Test Account — Switch Role</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {[ROLES.STUDENT, ROLES.MONITOR, ROLES.TEACHER, ROLES.ADMIN].map(role => (
                  <button
                    key={role}
                    type="button"
                    className={`auth-btn ${currentUser.role === role ? 'primary' : 'secondary'}`}
                    style={{ flex: 1, minWidth: '80px', fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                    disabled={testRoleBusy || currentUser.role === role}
                    onClick={() => handleSwitchRole(role)}
                  >
                    {role}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="auth-btn secondary"
                style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.82rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
                disabled={testRoleBusy}
                onClick={handleResetAccount}
              >
                🔄 Reset Test Account
              </button>
              {testMsg && <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem', textAlign: 'center' }}>{testMsg}</p>}
            </div>
          </div>
        )}

        <button className="auth-btn secondary profile-logout" style={{ marginTop: '2rem' }} onClick={() => { logout(); navigate('/'); }}>
          Logout
        </button>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1.5rem' }}>
          App Version: v{packageJson.version}
        </p>
      </div>
    </div>
  );
}
