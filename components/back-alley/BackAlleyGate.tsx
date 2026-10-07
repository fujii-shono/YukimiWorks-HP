'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';

export function BackAlleyGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { firebaseUser, profile, loading, profileLoading, configured, error, signIn, updateBackAlleyConfirmation } = useFirebaseAuth();
  const [saving, setSaving] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  if (loading || profileLoading) return <main className="back-alley-gate"><p>ログイン情報を確認しています…</p></main>;
  if (!firebaseUser) return (
    <main className="back-alley-gate">
      <section className="window-panel back-alley-gate-panel">
        <h1 className="window-title">裏路地</h1>
        <p>この先の閲覧にはログインが必要です。</p>
        {!configured ? <p className="form-error">Firebaseが設定されていません。</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <div className="back-alley-gate-actions">
          <button type="button" className="pixel-button" disabled={!configured} onClick={() => void signIn()}>Googleでログイン</button>
          <Link href="/">ログインせずに戻る</Link>
        </div>
      </section>
    </main>
  );
  if (!profile?.backAlleyConfirmed) return (
    <>
      <main className="back-alley-gate">
        <section className="window-panel back-alley-gate-panel" aria-labelledby="back-alley-confirm-title">
        <h1 id="back-alley-confirm-title" className="window-title">裏路地へ入りますか？</h1>
        <p>裏路地では少しニッチな作品を扱っています。大丈夫ですか？</p>
        {confirmError ? <p className="form-error">{confirmError}</p> : null}
        <div className="back-alley-gate-actions">
          <button type="button" className="pixel-button" disabled={saving} onClick={() => {
            setSaving(true); setConfirmError(null);
            void updateBackAlleyConfirmation(true).catch(() => setConfirmError('確認状態を保存できませんでした。')).finally(() => setSaving(false));
          }}>{saving ? '保存中…' : '大丈夫です'}</button>
          <button type="button" onClick={() => router.replace('/')}>戻る</button>
        </div>
        </section>
      </main>
    </>
  );
  return <>{children}</>;
}
