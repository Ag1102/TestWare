import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

// IMPORTANT: Replace with your Firebase project's configuration.
// You can find this in your Firebase project settings under "Project settings" > "General".
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

// --- START DEBUGGING BLOCK ---
// This code will help diagnose why the variables aren't loading.
// It will print the status of each variable to the console.
// This will run on the server-side, helping to pinpoint the issue.
if (typeof window === 'undefined') { // Only log this on the server
  console.log("\n--- Firebase Config Check (Server-Side) ---");
  console.log("NEXT_PUBLIC_FIREBASE_API_KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Loaded" : "MISSING!");
  console.log("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "Loaded" : "MISSING!");
  console.log("NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "Loaded" : "MISSING!");
  console.log("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? "Loaded" : "MISSING!");
  console.log("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? "Loaded" : "MISSING!");
  console.log("NEXT_PUBLIC_FIREBASE_APP_ID:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "Loaded" : "MISSING!");
  console.log("------------------------------------------\n");
}
// --- END DEBUGGING BLOCK ---

// This check allows the app to run without a Firebase config for local development or testing,
// although real-time features will be disabled.
const areCredsSet = 
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId;

if (areCredsSet) {
  try {
    // Initialize Firebase only once
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (e) {
    console.error("Firebase initialization failed:", e);
  }
} else {
  // We only show this warning on the server-side to avoid cluttering the browser console.
  if (typeof window === 'undefined') {
    console.warn("Firebase configuration not found or incomplete in environment variables. Real-time collaboration will be disabled.");
  }
}

export { db };
