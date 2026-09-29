'use client';

import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
};

// 開発中は Firebase プロジェクト未作成でも Local Emulator Suite をすぐ使える。
// 実プロジェクトへ接続して検証する場合だけ、.env.local で false を明示する。
const useEmulators =
  process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === 'true' ||
  (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS !== 'false');
let cachedServices: FirebaseServices | null | undefined;
let emulatorsConnected = false;

function getFirebaseConfig(): FirebaseOptions | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (useEmulators) {
    return {
      projectId: projectId || 'demo-yukimiworks',
      apiKey: apiKey || 'demo-api-key',
      authDomain: authDomain || 'demo-yukimiworks.firebaseapp.com',
      appId: appId || '1:1234567890:web:demo',
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-yukimiworks.appspot.com',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
    };
  }

  if (!projectId || !apiKey || !authDomain || !appId) return null;

  return {
    projectId,
    apiKey,
    authDomain,
    appId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };
}

export function getFirebaseServices(): FirebaseServices | null {
  if (cachedServices !== undefined) return cachedServices;

  const config = getFirebaseConfig();
  if (!config) {
    cachedServices = null;
    return cachedServices;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  const services = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
  };

  if (useEmulators && !emulatorsConnected) {
    connectAuthEmulator(services.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(services.db, '127.0.0.1', 8080);
    connectStorageEmulator(services.storage, '127.0.0.1', 9199);
    emulatorsConnected = true;
  }

  cachedServices = services;
  return services;
}

export function isFirebaseConfigured() {
  return getFirebaseConfig() !== null;
}
