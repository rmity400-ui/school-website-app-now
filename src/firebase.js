import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "PASTE_NEW_KEY_HERE",
  authDomain: "school-app-36954.firebaseapp.com",
  projectId: "school-app-36954",
  storageBucket: "school-app-36954.appspot.com",
  messagingSenderId: "449537720077",
  appId: "1:449537720077:web:e206b310294713276a7a44"
};

export const app = initializeApp(firebaseConfig);