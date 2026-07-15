/* Firebase Cloud Messaging service worker.
 *
 * Handles push messages when the app is in the background or fully closed.
 * Must live at the site root (/firebase-messaging-sw.js) so the browser
 * registers it with root scope.
 *
 * Uses the Firebase *compat* SDK via importScripts because service workers
 * cannot use ES module imports reliably across browsers. The config below
 * uses public client keys (the same ones shipped in the app bundle) — it is
 * safe for these to be public.
 */
/* global importScripts, firebase */
importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDYbxAGYrvgMaVwqYZ4pvg07XC5cqr_k80',
  authDomain: 'balmy-nuance-472404-q9.firebaseapp.com',
  projectId: 'balmy-nuance-472404-q9',
  storageBucket: 'balmy-nuance-472404-q9.firebasestorage.app',
  messagingSenderId: '976473529250',
  appId: '1:976473529250:web:9957553992382e8f0b70fb',
});

const messaging = firebase.messaging();

// Background message handler. FCM "data" messages (no top-level `notification`
// block) are delivered here so we control exactly how the notification looks.
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || 'IX HF Portal';
  const options = {
    body: data.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.tag || 'hi-portal',
    data: { url: data.url || '/' },
  };
  self.registration.showNotification(title, options);
});

// Focus or open the app when a notification is clicked.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
