import { collection, doc, setDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { homeworkData } from '../data/homeworkData';

export async function addHomework(dateStr, tasks) {
  const dateObj = new Date(dateStr);
  const id = dateObj.getTime().toString();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const displayDate = dateObj.toLocaleDateString('en-GB', options).replace(',', ''); 
  
  await setDoc(doc(db, 'homework', id), {
    id: Number(id),
    date: displayDate,
    tasks: tasks,
    timestamp: dateObj.getTime()
  });
}

export async function getHomework() {
  const q = query(collection(db, 'homework'), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ docId: d.id, ...d.data() }));
}

export async function migrateLegacyData() {
  let count = 0;
  for (const hw of homeworkData) {
    let dateParts = hw.date.split(', ');
    let dateString = dateParts.length > 1 ? dateParts[1] : hw.date;
    let dateObj = new Date(dateString);
    let timestamp = dateObj.getTime();
    
    if (isNaN(timestamp)) {
       // fallback for unparseable dates to maintain descending order
       timestamp = Date.now() - (hw.id * 100000);
    }
    
    await setDoc(doc(db, 'homework', hw.id.toString()), {
      ...hw,
      timestamp: timestamp
    });
    count++;
  }
  return count;
}
