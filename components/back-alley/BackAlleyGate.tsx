'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';

export function BackAlleyGate({ children, background }: { children: React.ReactNode; background: React.ReactNode }) {
  const router = useRouter();
  const { firebaseUser, profile, loading, profileLoading, configured, error, signIn, updateBackAlleyConfirmation } = useFirebaseAuth();
  const [saving, setSaving] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  if (loading || profileLoading) return <>{background}<div className="modal-overlay back-alley-gate-overlay"><section className="modal-panel modal-panel-small" role="status"><p>ログイン情報を確認しています…</p></section></div></>;
  if (!firebaseUser) return (
    <>{background}<div className="modal-overlay back-alley-gate-overlay">
      <section className="modal-panel modal-panel-small" role="dialog" aria-modal="true" aria-labelledby="back-alley-login-title">
        <h1 id="back-alley-login-title" className="window-title">裏ページ</h1>
        <p>この先の閲覧にはログインが必要です。</p>
        {!configured ? <p className="form-error">Firebaseが設定されていません。</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <div className="back-alley-gate-actions">
          <button type="button" className="pixel-button" disabled={!configured} onClick={() => void signIn()}>Googleでログイン</button>
          <button type="button" onClick={() => router.replace('/')}>ログインせずに戻る</button>
        </div>
      </section>
    </div></>
  );
  if (!profile?.backAlleyConfirmed) return (
    <>
      {background}
      <div className="modal-overlay back-alley-gate-overlay">
        <section className="modal-panel modal-panel-small" role="dialog" aria-modal="true" aria-labelledby="back-alley-confirm-title">
        <h1 id="back-alley-confirm-title" className="window-title">裏ページへ入りますか？</h1>
        <p>裏ページでは少しニッチな作品を扱っています。大丈夫ですか？</p>
        {confirmError ? <p className="form-error">{confirmError}</p> : null}
        <div className="back-alley-gate-actions">
          <button type="button" className="pixel-button" disabled={saving} onClick={() => {
            setSaving(true); setConfirmError(null);
            void updateBackAlleyConfirmation(true).catch(() => setConfirmError('確認状態を保存できませんでした。')).finally(() => setSaving(false));
          }}>{saving ? '保存中…' : '大丈夫です'}</button>
          <button type="button" onClick={() => router.replace('/')}>戻る</button>
        </div>
        </section>
      </div>
    </>
  );
  return <>{children}</>;
}
