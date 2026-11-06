import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDlFwAxxc_aSwnS4x6qzdy8HRXg5K51__A",
  authDomain: "nantixdatabase.firebaseapp.com",
  projectId: "nantixdatabase",
  storageBucket: "nantixdatabase.firebasestorage.app",
  messagingSenderId: "113131436211",
  appId: "1:113131436211:web:4255ff92a18899dfbf98c6",
  measurementId: "G-V41P1P2TNP"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
