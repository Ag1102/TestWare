import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

// This check allows the app to run without a Firebase config for local development or testing,
// although real-time features will be disabled.
// We will log the status of the variables to the browser console for easier debugging.
if (typeof window !== 'undefined') {
  console.log("--- Client-side Firebase Config Check ---");
  console.log("NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "Loaded" : "MISSING!");
  console.log("-----------------------------------------");
}

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

// This will now throw a more specific error if credentials are missing or invalid.
try {
  // Check if all required config values are present before initializing
  if (
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  ) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
  } else {
     // We only show this warning on the server-side to avoid cluttering the browser console.
    if (typeof window === 'undefined') {
      console.warn("Firebase configuration not found or incomplete in environment variables. Real-time collaboration will be disabled.");
    }
  }
} catch (e) {
  console.error("Firebase initialization failed:", e);
  db = null; // Ensure db is null on failure
}

export { db };
