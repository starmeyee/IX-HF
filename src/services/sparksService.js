import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const INITIAL_SPARKS = 10;
export const SPARK_VIEW_COST = 2;
export const SPARK_UPLOAD_REWARD = 4;

function userRef(phone) { return doc(db, 'users', phone); }

export async function getSparks(phone) {
  const snap = await getDoc(userRef(phone));
  if (!snap.exists()) return INITIAL_SPARKS;
  const data = snap.data();
  return data.sparks ?? INITIAL_SPARKS;
}

export async function getSparkLog(phone) {
  const snap = await getDoc(userRef(phone));
  if (!snap.exists()) return [];
  return snap.data().sparkLog || [];
}

async function adjustSparks(phone, delta, entry) {
  const snap = await getDoc(userRef(phone));
  const data = snap.exists() ? snap.data() : {};
  const current = data.sparks ?? INITIAL_SPARKS;
  const next    = Math.max(0, current + delta);
  const log     = data.sparkLog || [];
  const newEntry = { ...entry, at: Date.now(), balance: next };
  // Keep last 50 entries
  const newLog = [newEntry, ...log].slice(0, 50);
  await updateDoc(userRef(phone), { sparks: next, sparkLog: newLog });
  return next;
}

export async function spendSparks(phone, amount, reason) {
  return adjustSparks(phone, -amount, { type: 'spend', amount, reason });
}

export async function earnSparks(phone, amount, reason) {
  return adjustSparks(phone, +amount, { type: 'earn', amount, reason });
}
