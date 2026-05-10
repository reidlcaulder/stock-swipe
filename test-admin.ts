import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

try {
  const app = initializeApp({
    projectId: firebaseConfig.projectId,
    credential: applicationDefault()
  });
  
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  console.log("Firebase Admin Initialized successfully.");
  
  db.collection('test').doc('test').set({ test: true })
    .then(() => {
        console.log("Document successfully written!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error writing document: ", error);
        process.exit(1);
    });

} catch (error) {
  console.log("Error initializing admin:", error);
}
