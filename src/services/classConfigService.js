import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { rollList as defaultRollList } from '../auth/rollList';

const REF = doc(db, 'settings', 'classConfig');

// Generate default map from existing rollList
const defaultStudentNames = {};
defaultRollList.forEach(s => {
  defaultStudentNames[s.rollNo] = s.name;
});

export const DEFAULT_CLASS_CONFIG = {
  classTeacher: 'Abhay Sinha',
  totalStudents: 39,
  monitors: [], // Array of roll numbers (e.g. [1, 2])
  studentNames: defaultStudentNames,
  routine: {
    1: ['Hindi', 'Physics', 'IT', 'Civics', 'Maths', 'English'],
    2: ['Hindi', 'Physics', 'IT', 'Civics', 'Maths', 'English'],
    3: ['Hindi', 'Physics', 'Sports', 'History', 'Maths', 'Economics'],
    4: ['IT', 'Chemistry', 'Biology', 'History', 'Maths', 'Economics'],
    5: ['Hindi', 'Chemistry', 'Biology', 'Geography', 'Maths', 'English'],
    6: ['Hindi', 'Chemistry', 'Biology', 'Geography', 'Maths', 'English']
  }
};

export async function getClassConfig() {
  const snap = await getDoc(REF);
  if (snap.exists()) {
    return { ...DEFAULT_CLASS_CONFIG, ...snap.data() };
  }
  return DEFAULT_CLASS_CONFIG;
}

export async function updateClassConfig(updates) {
  await setDoc(REF, updates, { merge: true });
}
