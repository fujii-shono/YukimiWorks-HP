'use client';

import { useEffect, useState } from 'react';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';

const MIN_DONATION_AMOUNT = 50;
const MAX_DONATION_AMOUNT = 99_999_999;
const MAX_DISPLAY_NAME_LENGTH = 8;
const donationIncrements = [100, 1_000] as const;

function normalizeAmount(value: number) {
  if (!Number.isFinite(value)) return MIN_DONATION_AMOUNT;
  return Math.min(MAX_DONATION_AMOUNT, Math.max(MIN_DONATION_AMOUNT, Math.floor(value)));
}

export function MessageSupportForm() {
  const { loading, profile, profileLoading } = useFirebaseAuth();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(MIN_DONATION_AMOUNT));
  const [displayName, setDisplayName] = useState('');
  const currentAmount = normalizeAmount(Number(amount));

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (profile?.role === 'admin') setOpen(false);
  }, [profile?.role]);

  useEffect(() => {
    setDisplayName(profile?.displayName.slice(0, MAX_DISPLAY_NAME_LENGTH) ?? '');
  }, [profile?.displayName]);

  if (loading || profileLoading || profile?.role === 'admin') return null;

  return (
    <div className="messages-support-area">
      <button type="button" className="bokin-support-button messages-support-open" onClick={() => setOpen(true)}>
        応援する
      </button>
      {open ? (
        <div className="messages-support-backdrop" onMouseDown={() => setOpen(false)}>
          <section
            className="messages-support-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="messages-support-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="messages-compose-heading">
              <h2 id="messages-support-title">応援する</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="閉じる">×</button>
            </div>
            <form action="/api/bokin/checkout" method="post">
              <input type="hidden" name="source" value="messages" />
              <label htmlFor="messages-support-amount">支援金額</label>
              <div className="messages-support-amount-wrap">
                <input
                  id="messages-support-amount"
                  type="number"
                  name="amount"
                  min={MIN_DONATION_AMOUNT}
                  max={MAX_DONATION_AMOUNT}
                  step="1"
                  inputMode="numeric"
                  value={amount}
                  required
                  autoFocus
                  onChange={(event) => setAmount(event.target.value)}
                  onBlur={() => setAmount(String(currentAmount))}
                />
                <span>円</span>
              </div>
              <div className="messages-support-increments" aria-label="支援金額を追加する">
                {donationIncrements.map((increment) => (
                  <button
                    key={increment}
                    type="button"
                    className="bokin-amount-add-button"
                    onClick={() => setAmount(String(normalizeAmount(currentAmount + increment)))}
                  >
                    +{increment.toLocaleString('ja-JP')}
                  </button>
                ))}
              </div>
              <label htmlFor="messages-support-name">表示名</label>
              <input
                id="messages-support-name"
                type="text"
                name="displayName"
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                value={displayName}
                placeholder="匿名希望"
                autoComplete="nickname"
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <p>未入力の場合は匿名希望として支援メッセージに掲載されます。</p>
              <button type="submit" className="bokin-support-button messages-support-submit">
                Stripeで支援する
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
