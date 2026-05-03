import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "school-app-36954.firebaseapp.com",
  projectId: "school-app-36954",
  storageBucket: "school-app-36954.firebasestorage.app",
  messagingSenderId: "449537720077",
  appId: "1:449537720077:web:e206b310294713276a7a44"
};

const app = initializeApp(firebaseConfig); 

// --- ៣. បន្ទាប់មកទើបបង្កើត db និង auth ដោយប្រើ 'app' នោះ ---
const db = getFirestore(app); 
const auth = getAuth(app);