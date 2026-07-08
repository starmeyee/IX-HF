import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

const STAR_BATCH_SETTINGS_REF = doc(db, 'settings', 'starbatch');
const CODE_REGEX = /^\d{4}$/;

// External Star Batch users get a unique roll in this range, distinct from
// the real class roster (currently rolls 1-40). This replaces the old
// hardcoded rollNo: 85 shared by every external signup.
export const EXTERNAL_ROLL_MIN = 100;
export const EXTERNAL_ROLL_MAX = 199;

/**
 * Returns the next unused roll number in the external range (100-199),
 * based on the highest roll currently assigned. Starts at 100 if none exist.
 *
 * Note: this is a best-effort sequential assignment (read-then-write, not a
 * transaction). Two users registering in the same instant could theoretically
 * race and land on the same roll — acceptable risk for this app's scale, but
 * worth revisiting with a Firestore transaction if signups ever become
 * high-frequency/concurrent.
 */
export async function getNextStarBatchRoll() {
  const q = query(
    collection(db, 'users'),
    where('rollNo', '>=', EXTERNAL_ROLL_MIN),
    where('rollNo', '<=', EXTERNAL_ROLL_MAX)
  );
  const snap = await getDocs(q);
  let maxRoll = EXTERNAL_ROLL_MIN - 1;
  snap.docs.forEach(d => {
    const roll = Number(d.data().rollNo);
    if (roll > maxRoll) maxRoll = roll;
  });
  const next = maxRoll + 1;
  if (next > EXTERNAL_ROLL_MAX) {
    throw new Error('Star Batch external roll range (100-199) is full. Contact the admin.');
  }
  return next;
}

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
  if (!CODE_REGEX.test(code || '')) throw new Error("Code must be exactly 4 digits (0-9).");
  await ensureConfig();
  await updateDoc(STAR_BATCH_SETTINGS_REF, { code });
}

/**
 * Looks up a user document by roll number.
 * Returns the DocumentSnapshot's doc (with .ref) or null if not found.
 */
async function findUserDocByRoll(roll) {
  const q = query(collection(db, 'users'), where('rollNo', '==', roll));
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0];
}

export async function addInternalStudent(rollNo) {
  const roll = parseInt(rollNo, 10);
  if (isNaN(roll) || roll <= 0) throw new Error("Invalid roll number.");
  await ensureConfig();
  await updateDoc(STAR_BATCH_SETTINGS_REF, {
    internalRolls: arrayUnion(roll)
  });

  const userDoc = await findUserDocByRoll(roll);
  if (!userDoc) {
    // Roll was added to the allow-list, but no matching user account exists yet.
    // Surface this so the admin UI can warn instead of silently succeeding.
    throw new Error(`Roll ${roll} added to the list, but no registered user with that roll number was found. They will get access automatically once they register.`);
  }
  // Granting star batch eligibility also unlocks access immediately —
  // admins adding a student is treated as an explicit access grant.
  await updateDoc(userDoc.ref, { isStarBatch: true, hasUnlockedStarBatch: true });
}

export async function removeInternalStudent(rollNo) {
  const roll = parseInt(rollNo, 10);
  if (isNaN(roll) || roll <= 0) throw new Error("Invalid roll number.");
  await ensureConfig();
  await updateDoc(STAR_BATCH_SETTINGS_REF, {
    internalRolls: arrayRemove(roll)
  });

  const userDoc = await findUserDocByRoll(roll);
  if (!userDoc) {
    throw new Error(`Roll ${roll} removed from the list, but no matching user account was found to revoke access from.`);
  }
  // Revoke both eligibility and access. Note: if this user separately unlocked
  // via the public code, hasUnlockedStarBatch is still cleared here — removal
  // from the internal list always fully revokes access.
  await updateDoc(userDoc.ref, { isStarBatch: false, hasUnlockedStarBatch: false });
}

/**
 * Single source of truth for unlocking Star Batch access via the public 4-digit code.
 * Used by both the StarBatchPage unlock form and the StarLogin external-user flow.
 */
export async function unlockStarBatchWithCode(phone, code) {
  if (!phone) throw new Error("Missing phone number.");
  const config = await getStarBatchConfig();
  if (config.code !== code) {
    throw new Error("Invalid code.");
  }
  const userRef = doc(db, 'users', phone);
  await updateDoc(userRef, { hasUnlockedStarBatch: true });
}

// Backward-compatible alias (old name). Prefer unlockStarBatchWithCode in new code.
export const unlockStarBatch = unlockStarBatchWithCode;
