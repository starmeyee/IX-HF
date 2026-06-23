import { initializeApp } from 'firebase/app';
import { getAuth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Expose the raw config so the messaging service worker can be initialised
// with the same project (it can't read import.meta.env directly).
export const firebaseConfigPublic = firebaseConfig;

// VAPID public key for web push (safe to expose in the client bundle).
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Returns a Firebase Messaging instance, or null if the browser does not
 * support web push (e.g. iOS Safari when not installed as a PWA). Callers
 * must handle the null case gracefully.
 */
export async function getMessagingIfSupported() {
  try {
    if (!(await isSupported())) return null;
    return getMessaging(app);
  } catch (err) {
    console.warn('Firebase Messaging not supported:', err);
    return null;
  }
}

// ── Email link helpers ─────────────────────────────────────────

/**
 * Sends a Firebase Auth email link.
 * emailAction: 'verify' | 'reset'
 * phone: only required for 'reset'
 */
export async function sendEmailLink(email, emailAction, phone) {
  const base = `${window.location.origin}/?emailAction=${emailAction}`;
  const continueUrl = emailAction === 'reset' ? `${base}&phone=${encodeURIComponent(phone)}` : base;
  await sendSignInLinkToEmail(auth, email, {
    url: continueUrl,
    handleCodeInApp: true,
  });
  localStorage.setItem('emailForLink', email);
}

/**
 * Checks if the current URL is a sign-in link and consumes it.
 * Returns { email, emailAction, phone } if handled, null otherwise.
 */
export async function checkAndConsumeEmailLink(href) {
  if (!isSignInWithEmailLink(auth, href)) return null;
  const params = new URLSearchParams(new URL(href).search);
  const emailAction = params.get('emailAction');
  const phone = params.get('phone') || null;
  const email = localStorage.getItem('emailForLink');
  if (!email) return { emailAction, phone, email: null, needsEmail: true };
  await signInWithEmailLink(auth, email, href);
  await auth.signOut();
  localStorage.removeItem('emailForLink');
  return { emailAction, phone, email };
}
