import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase';
import { getUserByPhone, loginUser, registerUser, setPassword, updatePassword } from './authService';
import { getUserRole } from './roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const confirmationRef = useRef(null);
  const recaptchaRef = useRef(null);

  // Restore session from localStorage on mount
  useEffect(() => {
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
    const user = await loginUser(phone, password);
    if (!user) throw new Error('Invalid phone number or password.');
    user.role = getUserRole(user.rollNo);
    setCurrentUser(user);
    localStorage.setItem('auth_phone', phone);
    return user;
  }

  function logout() {
    setCurrentUser(null);
    localStorage.removeItem('auth_phone');
    auth.signOut().catch(() => {});
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
      register, savePassword, login, logout,
      sendOtp, verifyOtp, resetPassword,
    }}>
      {children}
      <div id="recaptcha-container" />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
