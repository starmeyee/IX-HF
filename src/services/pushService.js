import { getToken, deleteToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, getMessagingIfSupported, VAPID_KEY } from '../firebase';

/**
 * Web-push client helper.
 *
 * Flow:
 *   1. isPushSupported() — feature/platform check (handles iOS-not-installed).
 *   2. requestPermissionAndToken(user) — asks for permission, registers the
 *      service worker, fetches the FCM token, and saves it to Firestore.
 *   3. Token is stored at fcmTokens/{token} = { phone, name, createdAt,
 *      userAgent }. Keyed by token so re-registration upserts (no dupes).
 *
 * The server (api/send-notification.js) reads every fcmTokens doc, sends to
 * all of them, and prunes ones FCM reports as dead.
 */

const TOKENS = 'fcmTokens';

/** True if this browser can receive web push. */
export function isPushSupportedSync() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window &&
    'PushManager' in window
  );
}

/**
 * Detects iOS Safari that is NOT running as an installed PWA — web push is
 * unavailable there (works only when added to home screen on iOS 16.4+).
 */
export function isIosNeedsInstall() {
  const ua = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  return isIos && !isStandalone;
}

/** Current Notification permission ('granted' | 'denied' | 'default'). */
export function permissionState() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/** Registers the FCM service worker (idempotent). */
async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/firebase-messaging-sw.js');
}

/**
 * Requests notification permission and, if granted, fetches + persists the
 * FCM token for this device. Returns the token, or null on failure/denial.
 */
export async function requestPermissionAndToken(user) {
  if (!isPushSupportedSync()) return null;
  if (!VAPID_KEY) {
    console.warn('VITE_FIREBASE_VAPID_KEY is not set — cannot register for push.');
    return null;
  }

  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const swReg = await registerSW();
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swReg || undefined,
  });
  if (!token) return null;

  await saveToken(token, user);
  return token;
}

/** Upserts the token doc for this device. */
export async function saveToken(token, user) {
  await setDoc(
    doc(db, TOKENS, token),
    {
      token,
      phone: user?.phone || null,
      name: user?.name || null,
      createdAt: Date.now(),
      userAgent: navigator.userAgent || '',
    },
    { merge: true }
  );
}

/** Removes the token (used on logout / permission revoke). */
export async function removeToken() {
  try {
    const messaging = await getMessagingIfSupported();
    if (!messaging) return;
    // Best-effort: get the current token to know which doc to remove.
    const token = await getToken(messaging, { vapidKey: VAPID_KEY }).catch(() => null);
    if (token) {
      await deleteToken(messaging).catch(() => {});
      await deleteDoc(doc(db, TOKENS, token)).catch(() => {});
    }
  } catch (err) {
    console.warn('removeToken failed:', err);
  }
}

/**
 * Subscribes to foreground messages (app open + focused). FCM does NOT show a
 * system notification in the foreground, so we surface it via the callback
 * (e.g. an in-app toast). Returns an unsubscribe function.
 */
export async function onForegroundMessage(callback) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    const data = payload.data || payload.notification || {};
    callback({
      title: data.title || 'IX HF Portal',
      body: data.body || '',
      url: data.url || '/',
    });
  });
}

/**
 * Calls the serverless endpoint to fan a notification out to every device.
 * Admin-only — requires the caller's phone + broadcastKey (the server
 * re-validates both). Returns the parsed JSON summary.
 *
 * @param {object} args
 * @param {string} args.phone        admin's phone (doc id)
 * @param {string} args.broadcastKey admin's secret key (from ensureBroadcastKey)
 * @param {string} args.title
 * @param {string} [args.body]
 * @param {string} [args.url]
 * @param {string} [args.type]       'broadcast' | 'notice' | 'homework' | 'syllabus'
 */
export async function sendNotification({ phone, broadcastKey, title, body = '', url = '/', type = 'broadcast' }) {
  const res = await fetch('/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, broadcastKey, title, body, url, type }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Send failed (${res.status})`);
  }
  return data;
}
