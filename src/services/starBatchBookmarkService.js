import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, query, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';

export async function addBookmark(userId, bookmarkData) {
  if (!userId) throw new Error("User ID is required");
  // We use a predictable ID format: testId_questionIndex, but since questions might be dynamic,
  // we can just use a unique document ID or a hash. Since a user can bookmark a question multiple times 
  // if they aren't careful, we can use testId_questionIndex as the document ID to prevent duplicates.
  const docId = `${bookmarkData.chapterId}_${bookmarkData.questionIndex}`;
  const ref = doc(db, 'users', userId, 'starBatchBookmarks', docId);
  
  await setDoc(ref, {
    ...bookmarkData,
    createdAt: serverTimestamp()
  }, { merge: true });
}

export async function removeBookmark(userId, bookmarkId) {
  if (!userId) throw new Error("User ID is required");
  const ref = doc(db, 'users', userId, 'starBatchBookmarks', bookmarkId);
  await deleteDoc(ref);
}

export async function getUserBookmarks(userId) {
  if (!userId) return [];
  const q = query(collection(db, 'users', userId, 'starBatchBookmarks'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function checkIsBookmarked(userId, bookmarkId) {
  if (!userId) return false;
  const ref = doc(db, 'users', userId, 'starBatchBookmarks', bookmarkId);
  const snap = await getDoc(ref);
  return snap.exists();
}
