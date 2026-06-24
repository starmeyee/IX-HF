import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where,
} from 'firebase/firestore';
import { db } from '../firebase';

const COL = 'notes';

export async function submitNote({ sectionId, subjectId, chapterId, sectionName, subjectName, chapterName, title, description, blobUrl, uploaderPhone, uploaderName }) {
  return addDoc(collection(db, COL), {
    sectionId, subjectId, chapterId,
    sectionName, subjectName, chapterName,
    title, description: description || '',
    blobUrl,
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

export async function deleteNote(id) {
  // Delete blob from Vercel storage first, then remove Firestore doc
  try {
    const snap = await getDoc(doc(db, COL, id));
    const blobUrl = snap.data()?.blobUrl;
    if (blobUrl) {
      await fetch('/api/delete-note-blob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: blobUrl }),
      });
    }
  } catch (_) { /* don't block deletion if blob cleanup fails */ }
  await deleteDoc(doc(db, COL, id));
}

export async function getPublishedNotes() {
  const q = query(collection(db, COL), where('status', '==', 'published'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.approvedAt || 0) - (a.approvedAt || 0));
}

export async function getMyNotes(phone) {
  const q = query(collection(db, COL), where('uploaderPhone', '==', phone));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Upload PDF directly from browser to Vercel Blob. Returns { url } */
export async function uploadNotePDF(file) {
  const { upload } = await import('@vercel/blob/client');
  const blob = await upload(`notes/${Date.now()}-${file.name}`, file, {
    access: 'public',
    handleUploadUrl: '/api/upload-note',
    contentType: 'application/pdf',
  });
  return { url: blob.url };
}
