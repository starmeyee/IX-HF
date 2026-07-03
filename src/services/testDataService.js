import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const REF = doc(db, 'test_data', 'config');

export async function getTestData() {
  const snap = await getDoc(REF);
  return snap.exists() ? snap.data() : null;
}

export async function saveTestData(data) {
  await setDoc(REF, data, { merge: true });
}
