'use client';

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getFirebaseServices, isFirebaseConfigured } from '@/lib/firebase/client';
import type { SiteUser } from '@/lib/firebase/types';

type AuthContextValue = {
  firebaseUser: User | null;
  profile: SiteUser | null;
  loading: boolean;
  profileLoading: boolean;
  configured: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
};

const FirebaseAuthContext = createContext<AuthContextValue | null>(null);

function isSiteUser(value: unknown): value is SiteUser {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SiteUser>;
  return (
    typeof candidate.displayName === 'string' &&
    (candidate.plan === 'none' || candidate.plan === 'blue' || candidate.plan === 'night') &&
    typeof candidate.coins === 'number' &&
    Array.isArray(candidate.purchasedWorkIds) &&
    (candidate.role === 'user' || candidate.role === 'admin')
  );
}

async function ensureUserProfile(user: User) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase が設定されていません。');

  const userRef = doc(services.db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) return;

  await setDoc(userRef, {
    displayName: (user.displayName || 'ゲスト').trim().slice(0, 30),
    plan: 'none',
    coins: 10,
    purchasedWorkIds: [],
    role: 'user',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isFirebaseConfigured();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SiteUser | null>(null);
  const [loading, setLoading] = useState(configured);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const services = getFirebaseServices();
    if (!services) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(services.auth, (user) => {
      setFirebaseUser(user);
      setProfile(null);
      setError(null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const services = getFirebaseServices();
    if (!services || !firebaseUser) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let active = true;
    let unsubscribeProfile = () => {};
    setProfileLoading(true);

    void ensureUserProfile(firebaseUser)
      .then(() => {
        if (!active) return;
        unsubscribeProfile = onSnapshot(
          doc(services.db, 'users', firebaseUser.uid),
          (snapshot) => {
            const data = snapshot.data();
            setProfile(isSiteUser(data) ? data : null);
            setProfileLoading(false);
          },
          () => {
            setError('ユーザー情報を読み込めませんでした。');
            setProfileLoading(false);
          },
        );
      })
      .catch(() => {
        if (!active) return;
        setError('ユーザー情報を作成できませんでした。');
        setProfileLoading(false);
      });

    return () => {
      active = false;
      unsubscribeProfile();
    };
  }, [firebaseUser]);

  const signIn = useCallback(async () => {
    const services = getFirebaseServices();
    if (!services) {
      setError('Firebase の環境変数が設定されていません。');
      return;
    }

    setError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(services.auth, provider);
    } catch (signInError) {
      const code = typeof signInError === 'object' && signInError && 'code' in signInError ? String(signInError.code) : '';
      if (code !== 'auth/popup-closed-by-user') setError('Googleログインに失敗しました。もう一度お試しください。');
    }
  }, []);

  const signOut = useCallback(async () => {
    const services = getFirebaseServices();
    if (!services) return;
    setError(null);
    await firebaseSignOut(services.auth);
  }, []);

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      const services = getFirebaseServices();
      const normalizedName = displayName.trim();
      if (!services || !firebaseUser) throw new Error('ログインが必要です。');
      if (!normalizedName || normalizedName.length > 30) throw new Error('名前は1〜30文字で入力してください。');

      await updateDoc(doc(services.db, 'users', firebaseUser.uid), {
        displayName: normalizedName,
        updatedAt: serverTimestamp(),
      });
    },
    [firebaseUser],
  );

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      loading,
      profileLoading,
      configured,
      error,
      signIn,
      signOut,
      updateDisplayName,
    }),
    [configured, error, firebaseUser, loading, profile, profileLoading, signIn, signOut, updateDisplayName],
  );

  return <FirebaseAuthContext.Provider value={value}>{children}</FirebaseAuthContext.Provider>;
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (!context) throw new Error('useFirebaseAuth must be used inside FirebaseAuthProvider.');
  return context;
}

