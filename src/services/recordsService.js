import {
  collection, doc, addDoc, getDoc, getDocs, deleteDoc,
  setDoc, updateDoc, query, orderBy, where, serverTimestamp,
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

// Update table metadata: title, description, and/or column labels.
// Column ids and types are preserved so existing entry data stays mapped.
export async function updateTable(tableId, { title, description, columns }) {
  const patch = { updatedAt: serverTimestamp() };
  if (title !== undefined) patch.title = title.trim();
  if (description !== undefined) patch.description = description.trim();
  if (columns !== undefined) patch.columns = columns;
  await updateDoc(doc(db, TABLES, tableId), patch);
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
  // Read-modify-write: simplest, unambiguous approach.
  // 1. Read the current entry doc (if any)
  // 2. Merge the single column change into the values object in JS
  // 3. Write the whole document back
  const docRef = doc(db, ENTRIES, `${tableId}_${rollNo}`);
  const snap = await getDoc(docRef);
  const existing = snap.exists() ? (snap.data().values || {}) : {};

  await setDoc(docRef, {
    tableId,
    rollNo,
    values: { ...existing, [colId]: value },
    updatedAt: serverTimestamp(),
  });
}

// Admin grants/revokes which record table IDs a teacher can edit.
export async function setTeacherRecordTables(teacherId, tableIds) {
  await updateDoc(doc(db, 'teachers', teacherId), { recordTables: tableIds });
}
