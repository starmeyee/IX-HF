import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

const STAR_BATCH_SETTINGS_REF = doc(db, 'settings', 'starbatch');

// Ensure the config document exists
async function ensureConfig() {
  const snap = await getDoc(STAR_BATCH_SETTINGS_REF);
  if (!snap.exists()) {
    await setDoc(STAR_BATCH_SETTINGS_REF, { code: '0000', internalRolls: [] });
    return { code: '0000', internalRolls: [] };
  }
  return snap.data();
}

export async function getStarBatchConfig() {
  return await ensureConfig();
}

export async function setStarBatchCode(code) {
  if (!code || code.length !== 4) throw new Error("Code must be 4 digits.");
  await ensureConfig();
  await updateDoc(STAR_BATCH_SETTINGS_REF, { code });
}

export async function addInternalStudent(rollNo) {
  const roll = parseInt(rollNo, 10);
  if (isNaN(roll) || roll <= 0) throw new Error("Invalid roll number");
  await ensureConfig();
  await updateDoc(STAR_BATCH_SETTINGS_REF, {
    internalRolls: arrayUnion(roll)
  });
  
  // Find user by rollNo and update their doc
  const q = query(collection(db, 'users'), where('rollNo', '==', roll));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const userDoc = snap.docs[0];
    await updateDoc(userDoc.ref, { isStarBatch: true });
  }
}

export async function removeInternalStudent(rollNo) {
  const roll = parseInt(rollNo, 10);
  if (isNaN(roll) || roll <= 0) throw new Error("Invalid roll number");
  await ensureConfig();
  await updateDoc(STAR_BATCH_SETTINGS_REF, {
    internalRolls: arrayRemove(roll)
  });

  // Find user by rollNo and update their doc
  const q = query(collection(db, 'users'), where('rollNo', '==', roll));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const userDoc = snap.docs[0];
    await updateDoc(userDoc.ref, { isStarBatch: false });
  }
}

export async function unlockStarBatch(phone, code) {
  const config = await getStarBatchConfig();
  if (config.code !== code) {
    throw new Error("Invalid code.");
  }
  
  // Set flag on user
  const userRef = doc(db, 'users', phone);
  await updateDoc(userRef, { hasUnlockedStarBatch: true });
}
