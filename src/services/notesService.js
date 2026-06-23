import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc,
  query, where,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

const COL = 'notes';

export async function submitNote({ sectionId, subjectId, chapterId, sectionName, subjectName, chapterName, title, description, cloudinaryUrl, cloudinaryPublicId, uploaderPhone, uploaderName }) {
  return addDoc(collection(db, COL), {
    sectionId, subjectId, chapterId,
    sectionName, subjectName, chapterName,
    title, description: description || '',
    cloudinaryUrl, cloudinaryPublicId,
    uploaderPhone, uploaderName,
    status: 'pending',
    createdAt: Date.now(),
    approvedAt: null,
  });
}

export async function getNotesByChapter(chapterId) {
  const q = query(
    collection(db, COL),
    where('chapterId', '==', chapterId),
    where('status', '==', 'published')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.approvedAt || 0) - (a.approvedAt || 0));
}

export async function getPendingNotes() {
  const q = query(collection(db, COL), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function approveNote(id) {
  await updateDoc(doc(db, COL, id), { status: 'published', approvedAt: Date.now() });
}

export async function rejectNote(id, reason = '') {
  await updateDoc(doc(db, COL, id), { status: 'rejected', rejectionReason: reason, rejectedAt: Date.now() });
}

export async function getMyNotes(phone) {
  const q = query(collection(db, COL), where('uploaderPhone', '==', phone));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Upload PDF to Firebase Storage, returns { url, publicId } */
export async function uploadNotePDF(file) {
  const path = `notes/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storageRef = ref(storage, path);
  const snap = await uploadBytesResumable(storageRef, file, { contentType: 'application/pdf' });
  const url = await getDownloadURL(snap.ref);
  return { url, publicId: path };
}
