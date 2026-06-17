import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Thay thế các biến môi trường này bằng thông tin từ Firebase Console
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// Check if config is valid (not using placeholder)
const isConfigValid = firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "your_api_key" &&
    firebaseConfig.apiKey.length > 5;

let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let analytics = null;

if (isConfigValid) {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        googleProvider = new GoogleAuthProvider();
        analytics = getAnalytics(app);
    } catch (error) {
        console.error("Firebase Initialization Error:", error);
    }
} else {
    console.warn("Firebase config is missing or invalid. App running in Offline Mode.");
}

// App specific constants
export const APP_ID = import.meta.env.VITE_APP_ID || 'default-app-id';
export const GENERATIVE_AI_KEY = import.meta.env.VITE_GENERATIVE_AI_KEY || "";

export { auth, db, googleProvider, analytics };
export default app;
