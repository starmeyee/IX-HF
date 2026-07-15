import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import crypto from "crypto";

const firebaseConfig = {
  apiKey: "AIzaSyBuDJKsF_ww1Wc39T944lO7wrdVoO7RioE",
  authDomain: "ix-hf-1643e.firebaseapp.com",
  projectId: "ix-hf-1643e",
  storageBucket: "ix-hf-1643e.firebasestorage.app",
  messagingSenderId: "460898718893",
  appId: "1:460898718893:web:bcc4e15ad9d15e97912224"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function run() {
  try {
    const hash = sha256('Test@123');
    await setDoc(doc(db, "users", "9999999999"), {
      name: "Test User",
      phone: "9999999999",
      rollNo: 99,
      passwordHash: hash,
      activeRole: "STUDENT",
      createdAt: Date.now(),
      onboardingCompleted: false
    });
    console.log("Test user created successfully!");
  } catch (error) {
    console.error("Error creating test user:", error.message);
  }
  process.exit(0);
}

run();
