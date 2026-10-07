'use client';

import { useEffect, useState } from 'react';
import { subscribeToBackAlleyPortfolio } from '@/lib/firebase/backAlley';
import type { FirebaseBackAlleyPortfolioItem } from '@/lib/firebase/types';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';

export function useBackAlleyPortfolio() {
  const { profile } = useFirebaseAuth();
  const [items, setItems] = useState<FirebaseBackAlleyPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setError(null);
    setLoading(true);
    if (!profile || (profile.role !== 'admin' && !profile.backAlleyConfirmed)) {
      setItems([]);
      setLoading(false);
      return () => {};
    }
    return subscribeToBackAlleyPortfolio(
      (records) => { setItems(records); setLoading(false); },
      () => { setError('裏Portfolioを読み込めませんでした。'); setLoading(false); },
      { includeR18: profile.adultConfirmed === true, lockedR18: profile.adultConfirmed !== true },
    );
  }, [profile]);
  return { items, loading, error };
}
