import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyC5UUVIa-lqJ4CzeG7230spdtFGy6miBPE",
    authDomain: "companion-app-f7506.firebaseapp.com",
    projectId: "companion-app-f7506",
    storageBucket: "companion-app-f7506.firebasestorage.app",
    messagingSenderId: "268501518564",
    appId: "1:268501518564:web:dbfe7823093e89c63104f1",
    measurementId: "G-J2DD5PSQH0"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
