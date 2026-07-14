import fs from 'fs';

const filePath = 'src/services/starBatchTestService.js';
let content = fs.readFileSync(filePath, 'utf-8');

const additionalCode = `
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
`;

if (!content.includes('starBatchReportedQuestions')) {
  content += '\n' + additionalCode;
  fs.writeFileSync(filePath, content);
  console.log("Updated starBatchTestService.js");
} else {
  console.log("Already updated.");
}
