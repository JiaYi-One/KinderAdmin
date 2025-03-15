// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCUMD_LPPeLjD3tQCgqYWYLqIvqg7MOi7E",
  authDomain: "fyp1-89f1d.firebaseapp.com",
  projectId: "fyp1-89f1d",
  storageBucket: "fyp1-89f1d.firebasestorage.app",
  messagingSenderId: "216309172405",
  appId: "1:216309172405:web:bc626b69ed7018a63656fc",
  measurementId: "G-C7M9R3NDN6",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const db = getFirestore(app);

// Export the app and other Firebase services if needed
export { app, db, analytics };
