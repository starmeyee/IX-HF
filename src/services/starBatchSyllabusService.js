import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function addStarBatchQuestion(chapterId, topicName, questionText, imageUrl, user) {
  const ref = collection(db, 'starBatchQuestions');
  await addDoc(ref, {
    chapterId,
    topicName,
    questionText,
    imageUrl: imageUrl || null,
    authorName: user.name,
    authorRoll: user.rollNo || '85',
    createdAt: serverTimestamp()
  });
}

export async function getStarBatchQuestions(chapterId) {
  const q = query(collection(db, 'starBatchQuestions'), where('chapterId', '==', chapterId));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
}

export async function uploadImageToCloudinary(file) {
  // Try to use environment variables, or fallback to placeholders
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'YOUR_CLOUD_NAME';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'YOUR_UPLOAD_PRESET';
  
  if (cloudName === 'YOUR_CLOUD_NAME' || uploadPreset === 'YOUR_UPLOAD_PRESET') {
    throw new Error('Cloudinary not configured. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your environment variables or in the code.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });
  
  if (!res.ok) {
    throw new Error('Image upload failed. Please check your Cloudinary settings.');
  }
  const data = await res.json();
  return data.secure_url;
}
