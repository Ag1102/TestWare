import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let db: Firestore | null = null;

try {
  // Check if all required config values are present before initializing
  if (
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId &&
    // A simple check to ensure placeholders are replaced
    firebaseConfig.projectId !== "YOUR_PROJECT_ID" 
  ) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
  } else {
     // This warning helps diagnose if the .env.local file wasn't filled out.
    if (typeof window === 'undefined') {
      console.warn("Firebase configuration not found or is incomplete in .env.local. Real-time collaboration will be disabled.");
    }
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
  db = null; // Ensure db is null on failure
}

export { db };
