'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';
import type { AccountPurchaseProduct } from '@/lib/accountPurchaseProducts';

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
  const {
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
  } = useFirebaseAuth();
  const [modal, setModal] = useState<'login' | 'settings' | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [purchasing, setPurchasing] = useState<AccountPurchaseProduct | null>(null);
  const [purchaseNotice, setPurchaseNotice] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!firebaseUser || !profile) return;
    const url = new URL(window.location.href);
    const purchaseResult = url.searchParams.get('purchase');
    if (!purchaseResult) return;

    setModal('settings');
    if (purchaseResult === 'success') {
      setPurchaseNotice('決済が完了しました。購入内容の反映まで少しお待ちください。');
    } else if (purchaseResult === 'canceled') {
      setPurchaseNotice('購入をキャンセルしました。');
    }
    url.searchParams.delete('purchase');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, [firebaseUser, profile]);

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

  const purchase = async (product: AccountPurchaseProduct, label: string) => {
    setPurchasing(product);
    setPurchaseError(null);
    setPurchaseNotice(null);
    try {
      const result = await purchaseProduct(product);
      if (result === 'debug') setPurchaseNotice(`${label}をデバッグ購入しました。`);
    } catch (purchaseError) {
      setPurchaseError(purchaseError instanceof Error ? purchaseError.message : '購入状態を更新できませんでした。');
    } finally {
      setPurchasing(null);
    }
  };

  const manageSubscription = async () => {
    setPurchasing('blue-ticket');
    setPurchaseError(null);
    try {
      await openBillingPortal();
    } catch (portalError) {
      setPurchaseError(portalError instanceof Error ? portalError.message : '契約管理画面を開けませんでした。');
      setPurchasing(null);
    }
  };

  const isAdmin = profile?.role === 'admin';
  const hasBlueTicket = profile?.tickets.includes('blue') || false;
  const hasNightTicket = profile?.tickets.includes('night') || false;

  return (
    <>
      {!loading && firebaseUser && profile ? (
        <div className="account-status" aria-label="ログイン中のアカウント情報">
          <span className="account-welcome">
            ようこそ {isAdmin ? '管理者' : ''}{profile.displayName}さん
          </span>
          {!isAdmin && hasBlueTicket ? (
            <Image src="/icons/user/blue-ticket.png" alt="青チケット" width={16} height={16} className="account-item-icon pixel-image" unoptimized />
          ) : null}
          {!isAdmin && hasNightTicket ? (
            <Image src="/icons/user/yoru-ticket.png" alt="夜チケット" width={16} height={16} className="account-item-icon pixel-image" unoptimized />
          ) : null}
          {!isAdmin ? (
            <span className="account-coins" aria-label={`コイン ${profile.coins}枚`}>
              <Image src="/icons/user/coin.png" alt="" width={16} height={16} className="account-item-icon pixel-image" unoptimized />
              <span>{profile.coins}枚</span>
            </span>
          ) : null}
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
                      <div className="account-purchases">
                        {process.env.NEXT_PUBLIC_STRIPE_PURCHASE_DEBUG === 'true' ? (
                          <p className="account-purchase-note">現在はデバッグ購入モードです。</p>
                        ) : null}
                        <section>
                          <h3>コイン購入</h3>
                          <p>現在：{profile.coins}枚</p>
                          <div className="account-purchase-list">
                            <div className="account-purchase-row">
                              <span>コイン10枚</span><span>100円</span>
                              <button type="button" disabled={purchasing !== null} onClick={() => void purchase('coin-10', 'コイン10枚')}>購入</button>
                            </div>
                            <div className="account-purchase-row">
                              <span>コイン100+10枚</span><span>1000円</span>
                              <button type="button" disabled={purchasing !== null} onClick={() => void purchase('coin-110', 'コイン100+10枚')}>購入</button>
                            </div>
                          </div>
                        </section>
                        <section>
                          <h3>チケット購入</h3>
                          <div className="account-purchase-list">
                            <div className="account-purchase-row">
                              <span>青チケット（有料作品見放題+コイン30枚）</span><span>500円</span>
                              <button type="button" disabled={purchasing !== null || hasBlueTicket} onClick={() => void purchase('blue-ticket', '青チケット')}>
                                {hasBlueTicket ? '購入済み' : '購入'}
                              </button>
                            </div>
                            <div className="account-purchase-row">
                              <span>夜チケット（夜の作品見放題）</span><span>1000円</span>
                              <button type="button" disabled={purchasing !== null || hasNightTicket} onClick={() => void purchase('night-ticket', '夜チケット')}>
                                {hasNightTicket ? '購入済み' : '購入'}
                              </button>
                            </div>
                          </div>
                          {process.env.NEXT_PUBLIC_STRIPE_PURCHASE_DEBUG !== 'true' && (hasBlueTicket || hasNightTicket) ? (
                            <button type="button" className="account-portal-button" disabled={purchasing !== null} onClick={() => void manageSubscription()}>
                              契約内容・解約を管理
                            </button>
                          ) : null}
                        </section>
                        {purchaseNotice ? <p className="form-success" role="status">{purchaseNotice}</p> : null}
                        {purchaseError ? <p className="form-error">{purchaseError}</p> : null}
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
