// backend/firebase.ts
import admin from 'firebase-admin';

function initApp() {
  if (admin.apps.length) return admin.app();

  const svc = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (svc) {
    const creds = JSON.parse(svc) as admin.ServiceAccount;
    return admin.initializeApp({ credential: admin.credential.cert(creds) });
  }

  // Local/dev fallback: uses GOOGLE_APPLICATION_CREDENTIALS or gcloud auth ADC if available
  return admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

const app = initApp();
const db = admin.firestore();

export { admin, db };

