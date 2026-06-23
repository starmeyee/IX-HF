import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';
import { getUserByPhone, loginUser, registerUser, setPassword, updatePassword } from './authService';
import { getUserRole, ROLES } from './roles';
import { removeToken } from '../services/pushService';
import { loginTeacher, getTeacher } from '../services/teacherService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forceTour, setForceTour] = useState(null); // { role } | null
  const confirmationRef = useRef(null);
  const recaptchaRef = useRef(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const teacherSession = localStorage.getItem('teacher_session');
    if (teacherSession) {
      getTeacher(teacherSession)
        .then(t => {
          if (t) setCurrentUser({ ...t, role: ROLES.TEACHER });
        })
        .finally(() => setLoading(false));
      return;
    }
    const saved = localStorage.getItem('auth_phone');
    if (saved) {
      getUserByPhone(saved)
        .then((user) => { 
          if (user) {
            user.role = getUserRole(user.rollNo);
            setCurrentUser(user); 
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function refreshUser(phone) {
    const user = await getUserByPhone(phone);
    if (user) {
      user.role = getUserRole(user.rollNo);
      setCurrentUser(user);
    }
  }

  function openModal() { setModalOpen(true); }
  function closeModal() { setModalOpen(false); }

  async function register(name, phone, rollNo) {
    await registerUser({ name, phone, rollNo });
  }

  async function savePassword(phone, password) {
    await setPassword(phone, password);
    const user = await getUserByPhone(phone);
    if (user) user.role = getUserRole(user.rollNo);
    setCurrentUser(user);
    localStorage.setItem('auth_phone', phone);
  }

  async function login(phone, password) {
    const result = await loginUser(phone, password);
    if (!result) throw new Error('Invalid phone number or password.');
    if (result.__needsPasswordReset) {
      // Post-merge: redirect to password reset with primary phone
      throw Object.assign(new Error('NEEDS_PASSWORD_RESET'), { primaryPhone: result.phone });
    }
    result.role = getUserRole(result.rollNo);
    setCurrentUser(result);
    // If they logged in via alternate phone, persist the primary phone for session restore
    localStorage.setItem('auth_phone', result.phone);
    return result;
  }

  function logout() {
    // Best-effort: unsubscribe this device from push before clearing session.
    removeToken().catch(() => {});
    setCurrentUser(null);
    localStorage.removeItem('auth_phone');
    localStorage.removeItem('teacher_session');
    auth.signOut().catch(() => {});
  }

  async function loginTeacherCtx(id, password) {
    const teacher = await loginTeacher(id, password);
    if (!teacher) throw new Error('Incorrect password. Try again.');
    const user = { ...teacher, role: ROLES.TEACHER };
    setCurrentUser(user);
    localStorage.setItem('teacher_session', id);
    return user;
  }

  // OTP for forgot-password flow
  function setupRecaptcha(containerId) {
    if (recaptchaRef.current) {
      try { recaptchaRef.current.clear(); } catch (_) {}
    }
    recaptchaRef.current = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
    return recaptchaRef.current;
  }

  async function sendOtp(phone) {
    const verifier = setupRecaptcha('recaptcha-container');
    const formatted = phone.startsWith('+') ? phone : `+91${phone}`;
    confirmationRef.current = await signInWithPhoneNumber(auth, formatted, verifier);
  }

  async function verifyOtp(otp) {
    if (!confirmationRef.current) throw new Error('No OTP request pending.');
    await confirmationRef.current.confirm(otp);
  }

  async function resetPassword(phone, newPassword) {
    await updatePassword(phone, newPassword);
    const user = await getUserByPhone(phone);
    if (user) user.role = getUserRole(user.rollNo);
    setCurrentUser(user);
    localStorage.setItem('auth_phone', phone);
  }

  return (
    <AuthContext.Provider value={{
      currentUser: currentUser ? { ...currentUser, isAdmin: currentUser.role === 'ADMIN' } : null,
      loading,
      modalOpen, openModal, closeModal,
      register, savePassword, login, logout, loginTeacherCtx,
      sendOtp, verifyOtp, resetPassword,
      refreshUser,
      forceTour,
      triggerTour: (role) => setForceTour({ role }),
      clearTour: () => setForceTour(null),
    }}>
      {children}
      <div id="recaptcha-container" />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
