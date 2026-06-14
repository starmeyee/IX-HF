import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Camera } from 'lucide-react';

export default function ProfilePage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    if (!currentUser) { navigate('/'); return; }
    const saved = localStorage.getItem(`photo_${currentUser.phone}`);
    if (saved) setPhoto(saved);
  }, [currentUser, navigate]);

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

        <button className="auth-btn secondary profile-logout" onClick={() => { logout(); navigate('/'); }}>
          Logout
        </button>
      </div>
    </div>
  );
}
