import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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
  return snap.exists() ? snap.data() : null;
}

export async function registerUser({ name, phone, rollNo }) {
  const existing = await getUserByPhone(phone);
  if (existing) throw new Error('Phone already registered. Please login.');
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
