import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, arrayUnion, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export async function getInAppNotices() {
  const q = query(collection(db, 'in_app_notices'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addInAppNotice(data) {
  const docRef = await addDoc(collection(db, 'in_app_notices'), {
    ...data,
    createdAt: Date.now(),
  });
  return docRef.id;
}

export async function deleteInAppNotice(id) {
  await deleteDoc(doc(db, 'in_app_notices', id));
}

export async function markInAppNoticeSeen(phone, userName, noticeId) {
  if (!phone || !noticeId) return;
  const userRef = doc(db, 'users', phone);
  await updateDoc(userRef, {
    seenInAppNotices: arrayUnion(noticeId)
  });

  try {
    const noticeRef = doc(db, 'in_app_notices', noticeId);
    await updateDoc(noticeRef, {
      acknowledgedBy: arrayUnion(userName || phone)
    });
  } catch (e) {
    console.error("Failed to update acknowledgedBy list", e);
  }
}
