import {
  collection, doc, addDoc, getDocs, deleteDoc,
  setDoc, query, orderBy, where, serverTimestamp, FieldPath,
} from 'firebase/firestore';
import { db } from '../firebase';

const TABLES = 'records';
const ENTRIES = 'record_entries';

export async function createTable({ title, description, sensitive, columns }) {
  const ref = await addDoc(collection(db, TABLES), {
    title: title.trim(),
    description: description.trim(),
    sensitive: !!sensitive,
    columns,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getTables() {
  const snap = await getDocs(query(collection(db, TABLES), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteTable(tableId) {
  await deleteDoc(doc(db, TABLES, tableId));
}

export async function getEntries(tableId) {
  const q = query(collection(db, ENTRIES), where('tableId', '==', tableId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getMyEntries(rollNo) {
  const q = query(collection(db, ENTRIES), where('rollNo', '==', rollNo));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function setCellValue(tableId, rollNo, colId, value) {
  // Single atomic write:
  // - Creates the document if it doesn't exist
  // - Merges ONLY the specified dot-path field (values.<colId>)
  // - Never touches other columns already saved for this student
  const docRef = doc(db, ENTRIES, `${tableId}_${rollNo}`);
  await setDoc(
    docRef,
    {
      tableId,
      rollNo,
      [`values.${colId}`]: value,
      updatedAt: serverTimestamp(),
    },
    { mergeFields: ['tableId', 'rollNo', `values.${colId}`, 'updatedAt'] }
  );
}
