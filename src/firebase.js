import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBGExtb5ZiemY3wWpWj_fbp5rp6BbaDbcc",
  authDomain: "school-app-36954.firebaseapp.com",
  databaseURL: "https://school-app-36954-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "school-app-36954",
  storageBucket: "school-app-36954.firebasestorage.app",
  messagingSenderId: "449537720077",
  appId: "1:449537720077:web:e206b310294713276a7a44",
  measurementId: "G-BBCLLG82HD"
};

// Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// Export