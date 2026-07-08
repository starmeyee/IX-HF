import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const MAX_TOPIC_LENGTH = 120;
const MAX_QUESTION_LENGTH = 4000;

export async function addStarBatchQuestion(chapterId, topicName, questionText, imageUrl, user) {
  const trimmedTopic = (topicName || '').trim();
  const trimmedQuestion = (questionText || '').trim();

  if (!chapterId) throw new Error('Missing chapter.');
  if (!trimmedTopic) throw new Error('Topic name is required.');
  if (trimmedTopic.length > MAX_TOPIC_LENGTH) throw new Error(`Topic name must be under ${MAX_TOPIC_LENGTH} characters.`);
  if (!trimmedQuestion && !imageUrl) throw new Error('Add a question or upload an image.');
  if (trimmedQuestion.length > MAX_QUESTION_LENGTH) throw new Error(`Question text must be under ${MAX_QUESTION_LENGTH} characters.`);
  if (!user) throw new Error('Missing user.');

  const ref = collection(db, 'starBatchQuestions');
  await addDoc(ref, {
    chapterId,
    topicName: trimmedTopic,
    questionText: trimmedQuestion,
    imageUrl: imageUrl || null,
    authorName: user.name || 'Unknown',
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

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function uploadImageToCloudinary(file) {
  if (!file) throw new Error('No file provided.');
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Unsupported file type. Please upload a JPEG, PNG, WEBP, or GIF image.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image is too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)}MB). Please choose a smaller file.`);
  }

  // Try to use environment variables, or fallback to placeholders
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'YOUR_CLOUD_NAME';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'YOUR_UPLOAD_PRESET';
  
  if (cloudName === 'YOUR_CLOUD_NAME' || uploadPreset === 'YOUR_UPLOAD_PRESET') {
    throw new Error('Cloudinary not configured. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your environment variables or in the code.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  let res;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });
  } catch (networkErr) {
    throw new Error('Image upload failed due to a network error. Please check your connection and try again.', { cause: networkErr });
  }

  if (!res.ok) {
    throw new Error('Image upload failed. Please check your Cloudinary settings.');
  }
  const data = await res.json();
  if (!data.secure_url) {
    throw new Error('Image upload succeeded but no URL was returned. Please try again.');
  }
  return data.secure_url;
}
