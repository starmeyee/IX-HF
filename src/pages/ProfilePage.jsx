import { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Camera, ShieldAlert, ShieldCheck, User as UserIcon, Users, Mail, CheckCircle, Clock } from 'lucide-react';
import { ROLES } from '../auth/roles';
import { saveEmail } from '../auth/authService';
import { sendEmailLink } from '../firebase';
import packageJson from '../../package.json';

export default function ProfilePage() {
  const { currentUser, logout } = useAuth();
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
    if (!currentUser) navigate('/');
  }, [currentUser, navigate]);

  if (currentUser && loadedPhotoForPhone !== currentUser.phone) {
    setLoadedPhotoForPhone(currentUser.phone);
    setPhoto(localStorage.getItem(`photo_${currentUser.phone}`) || null);
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result;
      setPhoto(b64);
      localStorage.setItem(`photo_${currentUser.phone}`, b64);
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

  const maskedPhone = currentUser.phone.replace(/(\d{2})\d{6}(\d{2})/, '$1XXXXXX$2');

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
        <p className="profile-roll">{currentUser.rollNo === 0 ? 'Outsider Account' : `Class 10th HI · Roll No. ${currentUser.rollNo}`}</p>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
          {currentUser.role === ROLES.ADMIN && <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}><ShieldAlert size={14} style={{ marginRight: 4 }} /> ADMIN</span>}
          {currentUser.role === ROLES.MONITOR && <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}><ShieldCheck size={14} style={{ marginRight: 4 }} /> MONITOR</span>}
          {currentUser.role === ROLES.STUDENT && <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}><UserIcon size={14} style={{ marginRight: 4 }} /> STUDENT</span>}
          {currentUser.role === ROLES.OUTSIDER && <span className="badge" style={{ background: 'rgba(168, 162, 158, 0.1)', color: '#a8a29e', border: '1px solid rgba(168, 162, 158, 0.3)' }}><Users size={14} style={{ marginRight: 4 }} /> OUTSIDER</span>}
        </div>

        <div className="profile-info-grid">
          <div className="profile-info-item">
            <span className="profile-info-label">Login ID (Phone)</span>
            <span className="profile-info-value">{maskedPhone}</span>
          </div>
          <div className="profile-info-item">
            <span className="profile-info-label">{currentUser.rollNo === 0 ? 'Account Type' : 'Roll Number'}</span>
            <span className="profile-info-value">{currentUser.rollNo === 0 ? 'Outsider' : currentUser.rollNo}</span>
          </div>
          <div className="profile-info-item">
            <span className="profile-info-label">Registered</span>
            <span className="profile-info-value">{new Date(currentUser.createdAt).toLocaleDateString('en-IN')}</span>
          </div>
        </div>

        <p className="profile-photo-hint">Tap the photo to change it. Stored on this device only.</p>

        {/* ── Email Section ── */}
        <div className="profile-email-section">
          {verifiedToast && (
            <div className="profile-email-toast">
              <CheckCircle size={15} /> Email verified successfully!
            </div>
          )}
          {currentUser.email && currentUser.emailVerified ? (
            <div className="profile-info-item">
              <span className="profile-info-label">Recovery Email</span>
              <span className="profile-info-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle size={14} color="#10b981" />
                {currentUser.email.replace(/(.{2}).*(@.*)/, '$1…$2')}
              </span>
            </div>
          ) : currentUser.email && !currentUser.emailVerified ? (
            <div className="profile-info-item">
              <span className="profile-info-label">Recovery Email</span>
              <span className="profile-info-value" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <Clock size={14} color="#f59e0b" />
                {currentUser.email.replace(/(.{2}).*(@.*)/, '$1…$2')}
                <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>(pending)</span>
                <button type="button" className="auth-link" style={{ fontSize: '0.78rem' }}
                  onClick={handleResendVerification} disabled={emailBusy}>
                  {emailBusy ? 'Sending…' : 'Resend link'}
                </button>
              </span>
              {emailMsg && <p className="profile-email-msg">{emailMsg}</p>}
            </div>
          ) : showEmailForm ? (
            <form onSubmit={handleAddEmail} className="profile-email-form">
              <label className="profile-info-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} /> Recovery Email
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                <input
                  type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)}
                  placeholder="your@email.com" required autoFocus
                  style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.9rem' }}
                />
                <button className="auth-btn primary" type="submit" disabled={emailBusy}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  {emailBusy ? '…' : 'Send link'}
                </button>
                <button type="button" className="auth-btn secondary" onClick={() => { setShowEmailForm(false); setEmailMsg(''); }}
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                  Cancel
                </button>
              </div>
              {emailMsg && <p className="profile-email-msg">{emailMsg}</p>}
            </form>
          ) : (
            <button type="button" className="auth-btn secondary"
              onClick={() => setShowEmailForm(true)}
              style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
              <Mail size={15} /> Add Recovery Email
            </button>
          )}
        </div>

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
