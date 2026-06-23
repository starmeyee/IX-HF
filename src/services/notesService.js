import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc,
  query, where, orderBy,
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
    where('status', '==', 'published'),
    orderBy('approvedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPendingNotes() {
  const q = query(collection(db, COL), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function approveNote(id) {
  await updateDoc(doc(db, COL, id), { status: 'published', approvedAt: Date.now() });
}

export async function rejectNote(id) {
  await updateDoc(doc(db, COL, id), { status: 'rejected' });
}

export async function getMyNotes(phone) {
  const q = query(collection(db, COL), where('uploaderPhone', '==', phone), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
