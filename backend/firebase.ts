import admin, { ServiceAccount } from 'firebase-admin';

/**
 * Load service account from env.
 * Supports either:
 *  - FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON or base64)
 *  - FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 */
function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    let jsonStr = raw;
    try {
      // If base64, decode; otherwise keep as-is
      const maybe = Buffer.from(raw, 'base64').toString('utf8');
      if (maybe.startsWith('{') && maybe.endsWith('}')) jsonStr = maybe;
    } catch { /* ignore */ }

    try {
      const obj = JSON.parse(jsonStr);
      return {
        projectId: obj.project_id || obj.projectId,
        clientEmail: obj.client_email || obj.clientEmail,
        privateKey: String(obj.private_key || obj.privateKey || '').replace(/\\n/g, '\n'),
      };
    } catch (e) {
      console.error('[firebase] Could not parse FIREBASE_SERVICE_ACCOUNT_JSON:', (e as Error).message);
      // fall through to 3-var path
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }
  return null;
}

let _app: admin.app.App | null = null;

/** Initialize (once) and return the Admin app. */
function getAdminApp(): admin.app.App {
  if (_app) return _app;
  if (admin.apps.length) {
    _app = admin.app();
    return _app;
  }

  const svc = loadServiceAccount();
  if (svc) {
    _app = admin.initializeApp({
      credential: admin.credential.cert(svc),
      // projectId here helps when deploying to hosts that ignore GOOGLE_CLOUD_PROJECT
      projectId: svc.projectId,
    } as any);
    return _app;
  }

  // Local/dev fallback: ADC (gcloud / workload identity, etc.)
  _app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID, // optional but helpful
  } as any);
  return _app;
}

const app = getAdminApp();

// --- Firestore (Admin) ---
const db = admin.firestore(app);
// Must set options before first use
db.settings({ ignoreUndefinedProperties: true });

// Emulator support (optional)
const emulatorHost =
  process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HOST;
if (emulatorHost) {
  // Admin SDK will respect FIRESTORE_EMULATOR_HOST automatically,
  // but this log helps confirm.
  console.log(`[firebase] Using Firestore Emulator at ${emulatorHost}`);
}

export { admin, db };
