// ⚠️ REPLACE WITH YOUR FIREBASE CONFIG FROM FIREBASE CONSOLE
const firebaseConfig = {
    apiKey: "AIzaSyAzHiL2CtnEu0IXlJ3MZI_GNaOU38a6Ns0",
  authDomain: "habit-tracker-e50a2.firebaseapp.com",
  projectId: "habit-tracker-e50a2",
  storageBucket: "habit-tracker-e50a2.firebasestorage.app",
  messagingSenderId: "1034706899748",
  appId: "1:1034706899748:web:41cd9a9ea7e08600ea99b1"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.log('Persistence failed: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
            console.log('Persistence not available');
        }
    });

console.log('Firebase initialized');
