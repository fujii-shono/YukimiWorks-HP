'use client';

import Link from 'next/link';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';

const OPEN_ACCOUNT_EVENT = 'yukimi:open-account';

export function LoginEntryButton() {
  const { firebaseUser, profile, loading, profileLoading } = useFirebaseAuth();

  if (!loading && firebaseUser && profile?.role === 'admin') {
    return (
      <Link href="/admin" className="sidebar-login-button">
        管理画面
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="sidebar-login-button"
      disabled={loading || profileLoading}
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_ACCOUNT_EVENT, { detail: firebaseUser ? 'settings' : 'login' }))}
    >
      {firebaseUser ? 'アカウント' : 'ログイン'}
    </button>
  );
}

export function AccountControls() {
  const titleId = useId();
  const { firebaseUser, profile, loading, profileLoading, configured, error, signIn, signOut, updateDisplayName } =
    useFirebaseAuth();
  const [modal, setModal] = useState<'login' | 'settings' | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const openAccount = (event: Event) => {
      const requested = event instanceof CustomEvent && event.detail === 'settings' ? 'settings' : 'login';
      setModal(firebaseUser && requested === 'login' ? 'settings' : requested);
    };
    window.addEventListener(OPEN_ACCOUNT_EVENT, openAccount);
    return () => window.removeEventListener(OPEN_ACCOUNT_EVENT, openAccount);
  }, [firebaseUser]);

  useEffect(() => {
    if (profile) setDisplayName(profile.displayName);
  }, [profile]);

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModal(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [modal]);

  useEffect(() => {
    if (!firebaseUser && modal === 'settings') setModal('login');
  }, [firebaseUser, modal]);

  useEffect(() => {
    if (firebaseUser && modal === 'login') setModal(null);
  }, [firebaseUser, modal]);

  const submitName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await updateDisplayName(displayName);
    } catch (updateError) {
      setFormError(updateError instanceof Error ? updateError.message : '名前を更新できませんでした。');
    } finally {
      setSaving(false);
    }
  };

  const planLabel = profile?.plan === 'blue' ? '青チケ' : profile?.plan === 'night' ? '夜チケ' : null;
  const isAdmin = profile?.role === 'admin';

  return (
    <>
      {!loading && firebaseUser && profile ? (
        <div className="account-status" aria-label="ログイン中のアカウント情報">
          <span className="account-welcome">
            ようこそ {isAdmin ? '管理者' : ''}{profile.displayName}さん
          </span>
          {!isAdmin && planLabel ? <span className="account-plan">{planLabel}</span> : null}
          {!isAdmin ? <span className="account-coins">コイン枚数：{profile.coins}</span> : null}
          <button type="button" className="account-settings-button" onClick={() => setModal('settings')}>
            設定
          </button>
        </div>
      ) : null}

      {modal ? (
        <div className="account-modal-overlay" role="presentation" onMouseDown={() => setModal(null)}>
          <section
            className="account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="account-modal-close" aria-label="閉じる" onClick={() => setModal(null)}>
              ×
            </button>

            {modal === 'login' ? (
              <>
                <h2 id={titleId}>ログイン</h2>
                <p>Googleアカウントでログインすると、名前・プラン・コイン情報をこのサイトで利用できます。</p>
                {!configured ? <p className="form-error">Firebase の環境変数が未設定です。READMEをご確認ください。</p> : null}
                {error ? <p className="form-error">{error}</p> : null}
                <button type="button" className="pixel-button account-google-button" disabled={!configured || loading} onClick={() => void signIn()}>
                  Googleでログイン
                </button>
              </>
            ) : (
              <>
                <h2 id={titleId}>設定</h2>
                {profileLoading || !profile ? (
                  <p>ユーザー情報を読み込んでいます…</p>
                ) : (
                  <>
                    <form className="account-settings-form" onSubmit={submitName}>
                      <label htmlFor="account-display-name">名前変更</label>
                      <div className="account-name-row">
                        <input
                          id="account-display-name"
                          value={displayName}
                          maxLength={30}
                          required
                          onChange={(event) => setDisplayName(event.target.value)}
                        />
                        <button type="submit" className="pixel-button" disabled={saving}>
                          {saving ? '保存中…' : '保存'}
                        </button>
                      </div>
                      {formError ? <p className="form-error">{formError}</p> : null}
                    </form>

                    {isAdmin ? (
                      <Link className="pixel-button account-admin-link" href="/admin" onClick={() => setModal(null)}>
                        管理画面へ
                      </Link>
                    ) : (
                      <div className="account-coming-soon">
                        <section>
                          <h3>プラン変更</h3>
                          <p>現在：{planLabel || 'なし'}</p>
                          <button type="button" disabled>準備中</button>
                        </section>
                        <section>
                          <h3>コイン購入</h3>
                          <p>現在：{profile.coins}枚</p>
                          <button type="button" disabled>準備中</button>
                        </section>
                      </div>
                    )}

                    <button
                      type="button"
                      className="account-signout-button"
                      onClick={() => void signOut().then(() => setModal(null))}
                    >
                      ログアウト
                    </button>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
