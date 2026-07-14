import { collection, doc, setDoc, addDoc, getDocs, getDoc, query, where, orderBy, limit, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// ── Tests ──

async function processSingleTest(testData) {
  if (!testData.chapterId) throw new Error("Missing chapterId in JSON");
  if (!testData.questions || !Array.isArray(testData.questions) || testData.questions.length === 0) {
    throw new Error("Test must have questions array");
  }

  // Check if a test for this chapter already exists to act as a unified question bank
  const existingTest = await getTestByChapter(testData.chapterId);
  
  if (existingTest) {
    const ref = doc(db, 'starBatchTests', existingTest.id);
    
    // Deduplication logic: generate a unique key based on text and image
    const getQKey = (q) => {
      const text = (q.text || q.questionText || '').trim().toLowerCase();
      const img = (q.imageUrl || '').trim();
      return `${text}|${img}`;
    };

    const existingKeys = new Set(existingTest.questions.map(getQKey));
    const newUniqueQuestions = [];

    for (const q of testData.questions) {
      const key = getQKey(q);
      // Skip empty or purely duplicate questions
      if (key !== '|' && !existingKeys.has(key)) {
        existingKeys.add(key);
        newUniqueQuestions.push(q);
      }
    }

    if (newUniqueQuestions.length > 0) {
      await setDoc(ref, {
        questions: [...existingTest.questions, ...newUniqueQuestions],
        title: testData.title || existingTest.title
      }, { merge: true });
    }
    return existingTest.id;
  }

  // Create a new document in starBatchTests
  const ref = collection(db, 'starBatchTests');
  const docRef = await addDoc(ref, {
    chapterId: testData.chapterId,
    subjectId: testData.subjectId || 'Unknown',
    sectionId: testData.sectionId || 'Unknown',
    title: testData.title || 'Untitled Test',
    questions: testData.questions,
    createdAt: serverTimestamp()
  });
  
  return docRef.id;
}

export async function uploadTestJSON(testData) {
  if (Array.isArray(testData)) {
    const results = [];
    for (const test of testData) {
      results.push(await processSingleTest(test));
    }
    return results;
  } else {
    return await processSingleTest(testData);
  }
}

export async function getRecentTests() {
  const q = query(collection(db, 'starBatchTests'), orderBy('createdAt', 'desc'), limit(15));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllTests() {
  const q = query(collection(db, 'starBatchTests'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getTestByChapter(chapterId) {
  const q = query(collection(db, 'starBatchTests'), where('chapterId', '==', chapterId), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function getTestById(testId) {
  const ref = doc(db, 'starBatchTests', testId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Test not found");
  return { id: snap.id, ...snap.data() };
}

// ── Attempts ──

export async function submitTestAttempt(attemptData) {
  const ref = collection(db, 'starBatchTestAttempts');
  const docRef = await addDoc(ref, {
    userId: attemptData.userId,
    testId: attemptData.testId,
    chapterId: attemptData.chapterId,
    score: attemptData.score,
    total: attemptData.total,
    responses: attemptData.responses,
    weakTopics: attemptData.weakTopics || [],
    seenIndices: attemptData.seenIndices || [],
    aiReview: attemptData.aiReview || '',
    difficultyStats: attemptData.difficultyStats || null,
    topicStats: attemptData.topicStats || null,
    totalTime: attemptData.totalTime || 0,
    questionTimes: attemptData.questionTimes || {},
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function getTestAttemptById(attemptId) {
  const ref = doc(db, 'starBatchTestAttempts', attemptId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Attempt not found");
  return { id: snap.id, ...snap.data() };
}

export async function getUserTestHistory(userId) {
  const q = query(collection(db, 'starBatchTestAttempts'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Sort descending by createdAt in JS to avoid composite index requirement
  return docs.sort((a, b) => {
    const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
    const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
    return timeB - timeA;
  });
}

export function subscribeToUserHistory(userId, callback) {
  const q = query(collection(db, 'starBatchTestAttempts'), where('userId', '==', userId));
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => {
      const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return timeB - timeA;
    });
    callback(docs);
  }, (error) => {
    console.error("Error in history subscription:", error);
  });
}

export async function getAllTestAttempts() {
  const q = query(collection(db, 'starBatchTestAttempts'));
  const snap = await getDocs(q);
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return docs.sort((a, b) => {
    const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
    const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
    return timeB - timeA;
  });
}

export async function getUserTestAttemptsForTest(userId, testId) {
  const q = query(
    collection(db, 'starBatchTestAttempts'), 
    where('userId', '==', userId),
    where('testId', '==', testId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getTestAverageScore(testId) {
  const q = query(collection(db, 'starBatchTestAttempts'), where('testId', '==', testId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  
  let totalPercentage = 0;
  let validCount = 0;
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.total > 0) {
      totalPercentage += (data.score / data.total) * 100;
      validCount++;
    }
  });
  
  return validCount > 0 ? totalPercentage / validCount : null;
}

// ── Macro Reports ──

export async function getMacroReport(userId) {
  const ref = doc(db, 'starBatchMacroReports', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

export async function saveMacroReport(userId, reportData) {
  const ref = doc(db, 'starBatchMacroReports', userId);
  await setDoc(ref, {
    report: reportData.report,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function updateTestQuestions(testId, questions) {
  const ref = doc(db, 'starBatchTests', testId);
  await setDoc(ref, { questions }, { merge: true });
}


// ── Reported Questions ──
export async function reportTestQuestion(reportData) {
  const ref = collection(db, 'starBatchReportedQuestions');
  await addDoc(ref, {
    ...reportData,
    status: 'pending',
    createdAt: serverTimestamp()
  });
}

export async function getPendingReportedQuestions() {
  const q = query(collection(db, 'starBatchReportedQuestions'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function resolveReportedQuestion(reportId, action, testId, originalIndex) {
  // action: 'approve' or 'reject'
  // If approve, we mark the question in the test bank as isDeleted = true
  if (action === 'approve') {
    const testDocRef = doc(db, 'starBatchTests', testId);
    const snap = await getDoc(testDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const newQuestions = [...data.questions];
      if (newQuestions[originalIndex]) {
        newQuestions[originalIndex].isDeleted = true;
      }
      await setDoc(testDocRef, { questions: newQuestions }, { merge: true });
    }
  }
  
  // Mark report as resolved
  const reportRef = doc(db, 'starBatchReportedQuestions', reportId);
  await setDoc(reportRef, { status: action, resolvedAt: serverTimestamp() }, { merge: true });
}
