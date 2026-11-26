'use client';

import { useEffect, useState } from 'react';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';
import { subscribeToBackAlleyPortfolio } from '@/lib/firebase/backAlley';
import type { FirebaseBackAlleyPortfolioItem } from '@/lib/firebase/types';

export function useR18Works() {
  const { firebaseUser, profile, loading: authLoading, profileLoading } = useFirebaseAuth();
  const [items, setItems] = useState<FirebaseBackAlleyPortfolioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = Boolean(firebaseUser && profile?.adultConfirmed);

  useEffect(() => {
    setItems([]);
    setError(null);
    if (!enabled) {
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    return subscribeToBackAlleyPortfolio(
      (records) => {
        setItems(records);
        setLoading(false);
      },
      () => {
        setError('R18作品を読み込めませんでした。');
        setLoading(false);
      },
      { includeR18: true, r18Only: true },
    );
  }, [enabled]);

  return { items, loading: authLoading || profileLoading || loading, error, enabled };
}
