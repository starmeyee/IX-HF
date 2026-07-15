import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

// Read the service account key
const serviceAccount = JSON.parse(fsSync.readFileSync('./balmy-nuance-472404-q9-firebase-adminsdk-fbsvc-c26d120cb3.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Make a timestamped backup directory
const backupDirName = `firebase_backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
const backupDir = path.join(process.cwd(), backupDirName);

async function exportCollection(collectionRef, targetPath) {
  const snapshot = await collectionRef.get();
  if (snapshot.empty) return;
  
  await fs.mkdir(targetPath, { recursive: true });
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Create the file for this document
    const docPath = path.join(targetPath, `${doc.id}.json`);
    await fs.writeFile(docPath, JSON.stringify(data, null, 2));
    
    // Check for subcollections and export them inside a folder named after the document ID
    const subCollections = await doc.ref.listCollections();
    for (const subCol of subCollections) {
      await exportCollection(subCol, path.join(targetPath, doc.id, subCol.id));
    }
  }
}

async function main() {
  await fs.mkdir(backupDir, { recursive: true });
  console.log(`Starting Firebase backup to ./${backupDirName} ...`);
  
  const collections = await db.listCollections();
  for (const col of collections) {
    console.log(`Exporting collection: ${col.id} ...`);
    await exportCollection(col, path.join(backupDir, col.id));
  }
  
  console.log(`✅ Backup successfully saved in the folder: ./${backupDirName}`);
}

main().catch(console.error);
