
// ក្នុង file firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // ត្រូវមានពាក្យ export
export const db = getFirestore(app); // ត្រូវមានពាក្យ export