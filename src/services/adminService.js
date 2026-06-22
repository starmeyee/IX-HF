import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ── User Directory ─────────────────────────────────────────────
export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ── Activity Logging ───────────────────────────────────────────
// Schema: activityLogs/{phone} → { lastSeen, events: { pageName: count } }

function activityRef(phone) {
  return doc(db, 'activityLogs', phone);
}

export async function logActivity(phone, page) {
  if (!phone || !page) return;
  try {
    const ref = activityRef(phone);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data() : { events: {} };
    await setDoc(ref, {
      lastSeen: Date.now(),
      events: {
        ...existing.events,
        [page]: (existing.events?.[page] || 0) + 1,
      },
    });
  } catch (e) {
    // Non-blocking — never interrupt the user
    console.warn('logActivity failed:', e);
  }
}

export async function getActivitySummary() {
  const snap = await getDocs(collection(db, 'activityLogs'));
  return snap.docs.map((d) => ({ phone: d.id, ...d.data() }));
}
