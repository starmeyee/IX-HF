import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc,
  query, where,
} from 'firebase/firestore';
import { db } from '../firebase';

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

/** Upload PDF to Cloudinary unsigned, returns { url, publicId } */
export async function uploadNotePDF(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset    = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', preset);
  fd.append('resource_type', 'raw');
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
    method: 'POST', body: fd,
  });
  if (!res.ok) throw new Error('Upload failed. Try again.');
  const json = await res.json();
  return { url: json.secure_url, publicId: json.public_id };
}
