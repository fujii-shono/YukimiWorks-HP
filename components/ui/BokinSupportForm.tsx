'use client';

import Image from 'next/image';
import { type FormEvent, useState } from 'react';

const MIN_DONATION_AMOUNT = 50;
const MAX_DISPLAY_NAME_LENGTH = 8;
const BOKIN_CHARACTER_LAYER_COUNT = 6;
const donationIncrements = [100, 1_000, 10_000] as const;
const faceItems = [1, 2, 3, 4, 5] as const;

function normalizeAmount(value: number) {
  if (!Number.isFinite(value)) return MIN_DONATION_AMOUNT;
  return Math.max(MIN_DONATION_AMOUNT, Math.floor(value));
}

function resolveFaceIndex(amount: number) {
  if (amount >= 50_000) return 5;
  if (amount >= 10_000) return 4;
  if (amount >= 3_000) return 3;
  if (amount >= 500) return 2;
  return 1;
}

export function BokinSupportForm() {
  const [amount, setAmount] = useState(String(MIN_DONATION_AMOUNT));
  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [loadedCharacterLayers, setLoadedCharacterLayers] = useState(0);

  const currentAmount = normalizeAmount(Number(amount));
  const activeFaceIndex = resolveFaceIndex(currentAmount);
  const characterReady = loadedCharacterLayers >= BOKIN_CHARACTER_LAYER_COUNT;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (nameModalOpen) return;

    event.preventDefault();
    setNameModalOpen(true);
  };

  return (
    <div className="bokin-support-area">
      <form action="/api/bokin/checkout" method="post" className="bokin-support-form" onSubmit={handleSubmit}>
        <div className="bokin-amount-field">
          <span>支援金額</span>
          <div className="bokin-amount-add-buttons" aria-label="支援金額を追加する">
            {donationIncrements.map((increment) => (
              <button
                key={increment}
                type="button"
                className="bokin-amount-add-button"
                onClick={() => setAmount(String(currentAmount + increment))}
              >
                +{increment.toLocaleString('ja-JP')}
              </button>
            ))}
          </div>
          <label className="bokin-amount-input-wrap">
            <input
              type="number"
              name="amount"
              min={MIN_DONATION_AMOUNT}
              step="1"
              value={amount}
              inputMode="numeric"
              required
              onChange={(event) => setAmount(event.target.value)}
              onBlur={() => setAmount(String(currentAmount))}
            />
            <span>円</span>
          </label>
        </div>
        <button type="submit" className="bokin-support-button">
          支援する
        </button>
        {nameModalOpen ? (
          <div className="bokin-name-modal-backdrop">
            <div className="bokin-name-modal" role="dialog" aria-modal="true" aria-labelledby="bokin-name-modal-title">
              <h3 id="bokin-name-modal-title">表示名</h3>
              <p>メッセージ欄に掲載する表示名を入力できます。未入力の場合は匿名希望になります。</p>
              <label className="bokin-display-name-field">
                <span>表示名</span>
                <input
                  type="text"
                  name="displayName"
                  maxLength={MAX_DISPLAY_NAME_LENGTH}
                  placeholder="匿名希望"
                  autoComplete="nickname"
                />
              </label>
              <div className="bokin-name-modal-actions">
                <button type="button" className="bokin-name-modal-cancel" onClick={() => setNameModalOpen(false)}>
                  戻る
                </button>
                <button type="submit" className="bokin-support-button">
                  支援に進む
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </form>
      <div className={characterReady ? 'bokin-character is-ready' : 'bokin-character'} aria-hidden="true">
        <Image
          src="/bokin/tensi.png"
          alt=""
          width={1015}
          height={1000}
          className="bokin-character-layer"
          priority
          unoptimized
          onLoad={() => setLoadedCharacterLayers((count) => count + 1)}
        />
        {faceItems.map((faceIndex) => (
          <Image
            key={faceIndex}
            src={`/bokin/face${faceIndex}.png`}
            alt=""
            width={1015}
            height={1000}
            className={faceIndex === activeFaceIndex ? 'bokin-character-layer bokin-character-face is-active' : 'bokin-character-layer bokin-character-face'}
            unoptimized
            onLoad={() => setLoadedCharacterLayers((count) => count + 1)}
          />
        ))}
      </div>
    </div>
  );
}
