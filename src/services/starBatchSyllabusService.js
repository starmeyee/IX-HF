import { collection, addDoc, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

const MAX_TOPIC_LENGTH = 120;
const MAX_QUESTION_LENGTH = 4000;

export async function addStarBatchQuestion(chapterId, subjectId, topicName, questionText, imageUrl, marks, source, user) {
  const trimmedTopic = (topicName || '').trim();
  const trimmedQuestion = (questionText || '').trim();

  if (!chapterId) throw new Error('Missing chapter.');
  if (!subjectId) throw new Error('Missing subject.');
  if (trimmedTopic.length > MAX_TOPIC_LENGTH) throw new Error(`Topic name must be under ${MAX_TOPIC_LENGTH} characters.`);
  if (!trimmedQuestion && !imageUrl) throw new Error('Add a question or upload an image.');
  if (trimmedQuestion.length > MAX_QUESTION_LENGTH) throw new Error(`Question text must be under ${MAX_QUESTION_LENGTH} characters.`);
  if (!user) throw new Error('Missing user.');
  if (!marks) throw new Error('Marks are required.');
  if (!source) throw new Error('Source is required.');

  const ref = collection(db, 'starBatchQuestions');
  await addDoc(ref, {
    chapterId,
    subjectId,
    topicName: trimmedTopic || 'Untitled Topic',
    questionText: trimmedQuestion,
    imageUrl: imageUrl || null,
    marks,
    source,
    authorName: user.name || 'Unknown',
    authorRoll: user.rollNo || '85',
    bookmarkedBy: [],
    reports: [],
    createdAt: serverTimestamp()
  });
}

export async function bulkUploadStarBatchQuestions(questionsArray, user) {
  if (!Array.isArray(questionsArray)) throw new Error('Invalid JSON: Must be an array of questions.');
  if (questionsArray.length === 0) throw new Error('No questions found in the file.');
  if (questionsArray.length > 500) throw new Error('Maximum 500 questions allowed per bulk upload.');
  if (!user) throw new Error('Missing user.');

  const ref = collection(db, 'starBatchQuestions');
  
  // Firestore batch limit is 500 operations
  const batch = writeBatch(db);

  questionsArray.forEach((q, index) => {
    const trimmedTopic = (q.topicName || '').trim();
    const trimmedQuestion = (q.questionText || '').trim();

    if (!q.chapterId) throw new Error(`Row ${index + 1}: Missing chapterId.`);
    if (!q.subjectId) throw new Error(`Row ${index + 1}: Missing subjectId.`);
    if (!trimmedQuestion && !q.imageUrl) throw new Error(`Row ${index + 1}: Missing question text or image.`);
    if (!q.marks) throw new Error(`Row ${index + 1}: Missing marks.`);
    if (!q.source) throw new Error(`Row ${index + 1}: Missing source.`);

    const newDocRef = doc(ref);
    batch.set(newDocRef, {
      chapterId: q.chapterId,
      subjectId: q.subjectId,
      topicName: trimmedTopic || 'Untitled Topic',
      questionText: trimmedQuestion,
      imageUrl: q.imageUrl || null,
      marks: q.marks,
      source: q.source,
      authorName: user.name || 'Admin Bulk Upload',
      authorRoll: user.rollNo || 'Admin',
      bookmarkedBy: [],
      reports: [],
      createdAt: serverTimestamp()
    });
  });

  await batch.commit();
}

export async function getStarBatchQuestionsByChapter(chapterId) {
  const q = query(collection(db, 'starBatchQuestions'), where('chapterId', '==', chapterId));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
}

export async function getAllStarBatchQuestions() {
  const snap = await getDocs(collection(db, 'starBatchQuestions'));
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
}

export async function bookmarkQuestion(questionId, userId, isBookmarked) {
  const ref = doc(db, 'starBatchQuestions', questionId);
  await updateDoc(ref, {
    bookmarkedBy: isBookmarked ? arrayRemove(userId) : arrayUnion(userId)
  });
}

export async function reportQuestion(questionId, userId) {
  const ref = doc(db, 'starBatchQuestions', questionId);
  await updateDoc(ref, {
    reports: arrayUnion(userId)
  });
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

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'YOUR_CLOUD_NAME';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'YOUR_UPLOAD_PRESET';
  
  if (cloudName === 'YOUR_CLOUD_NAME' || uploadPreset === 'YOUR_UPLOAD_PRESET') {
    throw new Error('Cloudinary not configured.');
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
    throw new Error('Image upload failed due to a network error.', { cause: networkErr });
  }

  if (!res.ok) {
    throw new Error('Image upload failed. Please check your Cloudinary settings.');
  }
  const data = await res.json();
  if (!data.secure_url) {
    throw new Error('Image upload succeeded but no URL was returned.');
  }
  return data.secure_url;
}
