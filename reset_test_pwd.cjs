const admin = require('firebase-admin');
const crypto = require('crypto');
const serviceAccount = require('./balmy-nuance-472404-q9-firebase-adminsdk-fbsvc-c26d120cb3.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function run() {
  try {
    const hash = sha256('123456');
    await db.collection('users').doc('9999999999').update({ passwordHash: hash });
    console.log('Password reset successfully to 123456');
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
