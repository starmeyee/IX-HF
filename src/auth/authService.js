import { doc, getDoc, getDocs, collection, setDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Phone is the document ID
function userRef(phone) {
  return doc(db, 'users', phone);
}

export async function getUserByPhone(phone) {
  const snap = await getDoc(userRef(phone));
  if (!snap.exists()) return null;
  const data = snap.data();
  // If this phone was merged into another, transparently load the primary
  if (data.mergedInto) {
    const primarySnap = await getDoc(userRef(data.mergedInto));
    return primarySnap.exists() ? { ...primarySnap.data(), _loginPhone: phone } : null;
  }
  return data;
}

export async function registerUser({ name, phone, rollNo }) {
  const existing = await getUserByPhone(phone);
  if (existing) throw new Error('Phone already registered. Please login.');
  // Prevent duplicate roll numbers (unless rollNo is 0 = outsider)
  if (rollNo !== 0) {
    const allSnap = await getDocs(collection(db, 'users'));
    const dup = allSnap.docs.find(d => {
      const u = d.data();
      return Number(u.rollNo) === Number(rollNo) && !u.mergedInto;
    });
    if (dup) throw new Error('This roll number is already registered.');
  }
  await setDoc(userRef(phone), {
    name,
    phone,
    rollNo,
    passwordHash: null,
    createdAt: Date.now(),
  });
}

export async function setPassword(phone, password) {
  const hash = await sha256(password);
  await updateDoc(userRef(phone), { passwordHash: hash });
}

export async function loginUser(phone, password) {
  const user = await getUserByPhone(phone);
  if (!user) return null;
  // Post-merge: passwordHash cleared, user must set a new one
  if (!user.passwordHash) return { __needsPasswordReset: true, phone: user.phone };
  const hash = await sha256(password);
  if (hash !== user.passwordHash) return null;
  return user;
}

export async function updatePassword(phone, newPassword) {
  const hash = await sha256(newPassword);
  await updateDoc(userRef(phone), { passwordHash: hash });
}

export async function updateHolidayHomework(phone, completedKeys) {
  await updateDoc(userRef(phone), { completedHolidayHomework_v2: completedKeys });
}

export async function getHolidayHomework(phone) {
  const user = await getUserByPhone(phone);
  return user?.completedHolidayHomework_v2 || [];
}

export async function completeOnboarding(phone) {
  await updateDoc(userRef(phone), { onboardingCompleted: true });
}

// One-time "What's New" announcement (syllabus, classwork, CBSE attendance).
export async function completeWhatsNew(phone) {
  await updateDoc(userRef(phone), { whatsNewSeen_v1: true });
}

// Testing helper — clears the flag so the announcement shows again.
export async function resetWhatsNew(phone) {
  await updateDoc(userRef(phone), { whatsNewSeen_v1: false });
}

// ── Attendance ─────────────────────────────────────────────────
// Stored on the user document as an array of absent date keys
// (YYYY-MM-DD). All working days are implicitly "present"; only
// absences are persisted, keeping the document small.

export async function getAttendance(phone) {
  const user = await getUserByPhone(phone);
  return user?.attendance_absentDays || [];
}

export async function setAttendance(phone, absentDays) {
  // De-duplicate and sort for a clean, deterministic stored value.
  const cleaned = Array.from(new Set(absentDays)).sort();
  await updateDoc(userRef(phone), { attendance_absentDays: cleaned });
  return cleaned;
}


// ── Daily homework completion ──────────────────────────────────
// Keys are "{homeworkDocId}_{taskIndex}" strings.

export async function getHomeworkDone(phone) {
  const user = await getUserByPhone(phone);
  return user?.completedHomework || [];
}

export async function setHomeworkDone(phone, doneKeys) {
  const cleaned = Array.from(new Set(doneKeys));
  await updateDoc(userRef(phone), { completedHomework: cleaned });
  return cleaned;
}


// ── Syllabus "checked" topics (per-student) ────────────────────
// Keys are globally-unique topic IDs (e.g. "science-0-c0-t3"). A student
// may only meaningfully check topics the monitor has marked completed; the
// UI enforces this and the percentage math ignores orphaned checks.

export async function getCheckedTopics(phone) {
  const user = await getUserByPhone(phone);
  return user?.checkedTopics || [];
}

export async function setCheckedTopics(phone, checkedKeys) {
  const cleaned = Array.from(new Set(checkedKeys));
  await updateDoc(userRef(phone), { checkedTopics: cleaned });
  return cleaned;
}


// ── Broadcast key (admin push auth) ────────────────────────────
// The serverless send endpoint can't verify a Firebase ID token (this app
// uses custom phone+password auth), so an admin proves authority with a
// per-account secret stored on their user doc. Generated once, lazily.

function randomKey() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Email verification ─────────────────────────────────────────

export async function saveEmail(phone, email) {
  await updateDoc(userRef(phone), { email: email.toLowerCase(), emailVerified: false });
}

export async function markEmailVerified(phone) {
  await updateDoc(userRef(phone), { emailVerified: true });
}

export async function getUserByEmail(email) {
  const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  if (data.mergedInto) {
    const primarySnap = await getDoc(doc(db, 'users', data.mergedInto));
    return primarySnap.exists() ? primarySnap.data() : null;
  }
  return data;
}

export async function ensureBroadcastKey(phone) {
  const user = await getUserByPhone(phone);
  if (!user) throw new Error('User not found.');
  if (user.broadcastKey) return user.broadcastKey;
  const key = randomKey();
  await updateDoc(userRef(phone), { broadcastKey: key });
  return key;
}
