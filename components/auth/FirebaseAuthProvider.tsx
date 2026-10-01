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
import type { AccountPurchaseProduct } from '@/lib/accountPurchaseProducts';
import { getFirebaseServices, isFirebaseConfigured } from '@/lib/firebase/client';
import type { SiteUser, UserTicket } from '@/lib/firebase/types';

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
  purchaseProduct: (product: AccountPurchaseProduct) => Promise<'debug' | 'redirect'>;
  openBillingPortal: () => Promise<void>;
};

const FirebaseAuthContext = createContext<AuthContextValue | null>(null);

function parseSiteUser(value: unknown): SiteUser | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<SiteUser>;
  const valid =
    typeof candidate.displayName === 'string' &&
    (candidate.plan === 'none' || candidate.plan === 'blue' || candidate.plan === 'night') &&
    typeof candidate.coins === 'number' &&
    Array.isArray(candidate.purchasedWorkIds) &&
    (candidate.role === 'user' || candidate.role === 'admin') &&
    (candidate.tickets === undefined ||
      (Array.isArray(candidate.tickets) && candidate.tickets.every((ticket) => ticket === 'blue' || ticket === 'night')));
  if (!valid) return null;

  const tickets = new Set<UserTicket>(candidate.tickets || []);
  // 既存ユーザーの plan は移行せず、表示時だけチケット所持状態として引き継ぐ。
  if (candidate.plan === 'blue' || candidate.plan === 'night') tickets.add(candidate.plan);

  return { ...candidate, tickets: [...tickets] } as SiteUser;
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
    tickets: [],
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
            setProfile(parseSiteUser(data));
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

  const purchaseProduct = useCallback(
    async (product: AccountPurchaseProduct) => {
      const services = getFirebaseServices();
      if (!services || !firebaseUser) throw new Error('ログインが必要です。');

      const response = await fetch('/api/account/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await firebaseUser.getIdToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product }),
      });
      const result = (await response.json()) as { debug?: boolean; url?: string; error?: string };
      if (!response.ok) throw new Error(result.error || '購入処理に失敗しました。');
      if (result.debug) return 'debug';
      if (!result.url) throw new Error('Stripeの購入画面URLを取得できませんでした。');

      window.location.assign(result.url);
      return 'redirect';
    },
    [firebaseUser],
  );

  const openBillingPortal = useCallback(async () => {
    if (!firebaseUser) throw new Error('ログインが必要です。');
    const response = await fetch('/api/account/portal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await firebaseUser.getIdToken()}` },
    });
    const result = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !result.url) throw new Error(result.error || '契約管理画面を開けませんでした。');
    window.location.assign(result.url);
  }, [firebaseUser]);

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
      purchaseProduct,
      openBillingPortal,
    }),
    [configured, error, firebaseUser, loading, openBillingPortal, profile, profileLoading, purchaseProduct, signIn, signOut, updateDisplayName],
  );

  return <FirebaseAuthContext.Provider value={value}>{children}</FirebaseAuthContext.Provider>;
}

export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (!context) throw new Error('useFirebaseAuth must be used inside FirebaseAuthProvider.');
  return context;
}
