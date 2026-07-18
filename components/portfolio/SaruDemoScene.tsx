'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { PortfolioMediaVariant } from '@/data/portfolio';
import { cn } from '@/lib/format';

type SaruDemoSceneProps = {
  variant: PortfolioMediaVariant;
};

type LevelId = 'level1' | 'level2' | 'level3';

type LevelConfig = {
  id: LevelId;
  label: string;
  targetLabel: string;
  targetTokens: string[];
  fixedLimit: number;
  clearMessage: string;
};

const KATAKANA_POOL = [
  'ア',
  'イ',
  'ィ',
  'ウ',
  'エ',
  'ェ',
  'オ',
  'カ',
  'キ',
  'ク',
  'ケ',
  'コ',
  'サ',
  'シ',
  'ス',
  'ソ',
  'タ',
  'チ',
  'ツ',
  'テ',
  'ト',
  'ダ',
  'ヴ',
  'ナ',
  'ニ',
  'ヌ',
  'ネ',
  'ノ',
  'ハ',
  'ヒ',
  'フ',
  'ヘ',
  'ホ',
  'ピ',
  'プ',
  'ペ',
  'ポ',
  'マ',
  'ミ',
  'ム',
  'メ',
  'モ',
  'ヤ',
  'ユ',
  'ヨ',
  'ラ',
  'リ',
  'ル',
  'レ',
  'ロ',
  'ワ',
  'ン',
];

const LEVELS: LevelConfig[] = [
  {
    id: 'level1',
    label: 'レベル1',
    targetLabel: 'ピカソ',
    targetTokens: ['ピ', 'カ', 'ソ'],
    fixedLimit: 2,
    clearMessage: 'おめでとう！これで君も立派なサルだ！',
  },
  {
    id: 'level2',
    label: 'レベル2',
    targetLabel: 'ダヴィンチ',
    targetTokens: ['ダ', 'ヴ', 'ィ', 'ン', 'チ'],
    fixedLimit: 3,
    clearMessage: 'すごい！君の忍耐は現代人を超えた！',
  },
  {
    id: 'level3',
    label: 'レベル3',
    targetLabel: 'シェイクスピア',
    targetTokens: ['シ', 'ェ', 'イ', 'ク', 'ス', 'ピ', 'ア'],
    fixedLimit: 0,
    clearMessage: '信じられない！君はまさに超人類！',
  },
];

function getLevelConfig(levelId: LevelId) {
  return LEVELS.find((level) => level.id === levelId) ?? LEVELS[0];
}

function getRandomToken() {
  return KATAKANA_POOL[Math.floor(Math.random() * KATAKANA_POOL.length)];
}

function createLetters(targetTokens: string[]) {
  let nextLetters = targetTokens.map(() => getRandomToken());

  while (nextLetters.every((token, index) => token === targetTokens[index])) {
    nextLetters = targetTokens.map(() => getRandomToken());
  }

  return nextLetters;
}

function createInitialLetters(targetTokens: string[]) {
  return targetTokens.map((_, index) => KATAKANA_POOL[(index + 3) % KATAKANA_POOL.length]);
}

function isSolved(letters: string[], targetTokens: string[]) {
  return letters.length === targetTokens.length && letters.every((token, index) => token === targetTokens[index]);
}

export function SaruDemoScene({ variant }: SaruDemoSceneProps) {
  const [levelId, setLevelId] = useState<LevelId>('level1');
  const [letters, setLetters] = useState<string[]>(() => createInitialLetters(getLevelConfig('level1').targetTokens));
  const [fixedIndexes, setFixedIndexes] = useState<number[]>([]);
  const [clearOpen, setClearOpen] = useState(false);
  const solvedLevelRef = useRef<LevelId | null>(null);
  const level = getLevelConfig(levelId);
  const fixedCount = fixedIndexes.length;

  useEffect(() => {
    const nextLevel = getLevelConfig(levelId);
    setLetters(createLetters(nextLevel.targetTokens));
    setFixedIndexes([]);
    setClearOpen(false);
    solvedLevelRef.current = null;
  }, [levelId]);

  useEffect(() => {
    if (!isSolved(letters, level.targetTokens)) {
      if (solvedLevelRef.current === level.id) {
        solvedLevelRef.current = null;
      }
      return;
    }

    if (solvedLevelRef.current === level.id) {
      return;
    }

    solvedLevelRef.current = level.id;
    setClearOpen(true);
  }, [letters, level]);

  const handleToggleFixed = (index: number) => {
    if (level.fixedLimit === 0) {
      return;
    }

    setFixedIndexes((current) => {
      if (current.includes(index)) {
        return current.filter((item) => item !== index);
      }

      if (current.length >= level.fixedLimit) {
        return current;
      }

      return [...current, index];
    });
  };

  const handleShake = () => {
    setLetters((current) =>
      current.map((token, index) => {
        if (fixedIndexes.includes(index)) {
          return token;
        }

        return getRandomToken();
      }),
    );
  };

  return (
    <div className={cn('saru-demo-scene', `saru-demo-scene-${variant}`)}>
      <div className="saru-demo-shell">
        <div className="saru-demo-levels" role="tablist" aria-label="レベル選択">
          {LEVELS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === level.id}
              className={cn('saru-demo-level-button', item.id === level.id && 'is-active')}
              onClick={() => setLevelId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <section className="saru-demo-game" aria-label="ゲーム本体">
          <div className="saru-demo-target">
            <p className="saru-demo-label">お題</p>
            <p className="saru-demo-target-word">{level.targetLabel}</p>
          </div>

          <div className="saru-demo-status">
            {level.fixedLimit > 0 ? (
              <p>固定: {fixedCount} / {level.fixedLimit}</p>
            ) : (
              <p>このレベルは固定できません</p>
            )}
          </div>

          <div
            className="saru-demo-letter-grid"
            role="group"
            aria-label="カタカナボックス"
            style={{ '--saru-letter-count': String(letters.length) } as CSSProperties}
          >
            {letters.map((token, index) => {
              const fixed = fixedIndexes.includes(index);

              return (
                <button
                  key={`${level.id}-${index}`}
                  type="button"
                  className={cn('saru-demo-letter', fixed && 'is-fixed')}
                  aria-pressed={fixed}
                  aria-label={fixed ? `${token} 固定中` : `${token} を固定する`}
                  onClick={() => handleToggleFixed(index)}
                >
                  <span>{token}</span>
                </button>
              );
            })}
          </div>

          <div className="saru-demo-actions">
            <button type="button" className="pixel-button saru-demo-shake-button" onClick={handleShake}>
              シェイク
            </button>
          </div>
        </section>
      </div>

      {clearOpen ? (
        <div className="saru-demo-inline-modal" role="dialog" aria-modal="true" aria-label="クリアメッセージ">
          <div className="saru-demo-inline-modal-panel">
            <p>{level.clearMessage}</p>
            <button type="button" className="saru-demo-mini-button" onClick={() => setClearOpen(false)}>
              閉じる
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
