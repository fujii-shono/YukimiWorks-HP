'use client';

import { useRef, useState } from 'react';
import odaiSource from '@/data/odai.json';
import legacyHistorySource from '@/data/odai-history.json';
import {
  buildOdaiHashtags,
  generateOdai,
  type GeneratedOdai,
} from '@/lib/odai/generator';

type WeeklyOdai = {
  weekId: string;
  topic: string;
  displayText: string;
  validFrom: string;
  validUntil: string;
};

function CopyHashtags({ topic, label }: { topic: string; label: string }) {
  const [status, setStatus] = useState('');
  const hashtags = buildOdaiHashtags(topic);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hashtags);
      setStatus('ハッシュタグをコピーしました。');
    } catch {
      setStatus('コピーできませんでした。欄内の文字を選択してコピーしてください。');
    }
  };

  return (
    <div className="odai-copy-area">
      <label htmlFor={`odai-hashtags-${label}`}>{label}</label>
      <div className="odai-copy-row">
        <input
          id={`odai-hashtags-${label}`}
          type="text"
          readOnly
          value={hashtags}
          onFocus={(event) => event.currentTarget.select()}
        />
        <button type="button" className="pixel-button odai-copy-button" onClick={() => void copy()}>
          コピー
        </button>
      </div>
      <p className="odai-status" role="status" aria-live="polite">{status}</p>
    </div>
  );
}

export function OdaiMaker({ weeklyOdai }: { weeklyOdai: WeeklyOdai | null }) {
  const [randomOdai, setRandomOdai] = useState<GeneratedOdai | null>(null);
  const sessionHistory = useRef<string[]>([]);

  const draw = () => {
    const legacyHistory = (legacyHistorySource as unknown[]).filter(
      (value): value is string => typeof value === 'string',
    );
    const pastTexts = [
      ...legacyHistory,
      ...(weeklyOdai ? [weeklyOdai.displayText] : []),
      ...sessionHistory.current,
    ].slice(-30);
    const generated = generateOdai(odaiSource, pastTexts);
    sessionHistory.current = [...sessionHistory.current, generated.displayText].slice(-30);
    setRandomOdai(generated);
  };

  return (
    <div className="odai-maker">
      <section className="odai-section" aria-labelledby="random-odai-title">
        <h3 id="random-odai-title">ランダムお題</h3>
        <p className="odai-help">ボタンを押すたびに新しいお題を抽選します。</p>
        <p className="odai-result odai-random-result" aria-live="polite">
          {randomOdai?.topic ?? '？'}
        </p>
        <button type="button" className="pixel-button odai-draw-button" onClick={draw}>
          お題を出す
        </button>
        {randomOdai ? <CopyHashtags topic={randomOdai.topic} label="ランダムお題のハッシュタグ" /> : null}
      </section>

      <section className="odai-section odai-weekly" aria-labelledby="weekly-odai-title">
        <h3 id="weekly-odai-title">今週のお題</h3>
        {weeklyOdai ? (
          <>
            <p className="odai-result">{weeklyOdai.topic}</p>
            <p className="odai-period">
              <time dateTime={weeklyOdai.validFrom}>{weeklyOdai.weekId}</time>の週
            </p>
            <CopyHashtags topic={weeklyOdai.topic} label="今週のお題のハッシュタグ" />
          </>
        ) : (
          <p className="odai-empty">今週のお題は準備中です。</p>
        )}
      </section>
    </div>
  );
}
