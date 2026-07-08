import { collection, getDocs, doc, setDoc, getDoc, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

// ── User Directory ─────────────────────────────────────────────
export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteUserDoc(phone) {
  if (!phone) return;
  await deleteDoc(doc(db, 'users', phone));
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

// ── Test data purge ────────────────────────────────────────────
export async function purgeTestData() {
  const cols = ['notes', 'homework', 'classwork'];
  let total = 0;
  await Promise.all(cols.map(async (col) => {
    const q = query(collection(db, col), where('isTest', '==', true));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, col, d.id))));
    total += snap.docs.length;
  }));
  return total;
}
