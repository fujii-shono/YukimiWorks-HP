import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let adminApp: App | null = null;

function usesFirebaseEmulators() {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === 'true' ||
    (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS !== 'false')
  );
}

function getAdminApp() {
  if (adminApp) return adminApp;

  const emulatorMode = usesFirebaseEmulators();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-yukimiworks';

  if (emulatorMode) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
    process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
    process.env.GCLOUD_PROJECT ||= projectId;
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ||= '127.0.0.1:9199';
  }

  const existingApp = getApps().find((app) => app.name === 'yukimiworks-server');
  if (existingApp) {
    adminApp = existingApp;
    return adminApp;
  }

  if (emulatorMode) {
    adminApp = initializeApp({ projectId, storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com` }, 'yukimiworks-server');
    return adminApp;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!process.env.FIREBASE_PROJECT_ID || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin の環境変数が設定されていません。');
  }

  adminApp = initializeApp(
    {
      credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail, privateKey }),
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    },
    'yukimiworks-server',
  );
  return adminApp;
}

export function getFirebaseAdminServices() {
  const app = getAdminApp();
  return { auth: getAuth(app), db: getFirestore(app), storage: getStorage(app) };
}

export async function requireFirebaseUser(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('AUTH_REQUIRED');

  const idToken = authorization.slice('Bearer '.length).trim();
  if (!idToken) throw new Error('AUTH_REQUIRED');

  const { auth, db } = getFirebaseAdminServices();
  const decodedToken = await auth.verifyIdToken(idToken);
  return decodedToken;
}

export async function requireFirebaseAdmin(request: Request) {
  const decodedToken = await requireFirebaseUser(request);
  const { db } = getFirebaseAdminServices();
  const userSnapshot = await db.collection('users').doc(decodedToken.uid).get();
  if (userSnapshot.data()?.role !== 'admin') throw new Error('ADMIN_REQUIRED');

  return decodedToken;
}
