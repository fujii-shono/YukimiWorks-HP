'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/format';
import { useProtectedImageSource } from '@/components/back-alley/ProtectedImage';
import type { FirebaseBackAlleyPortfolioItem } from '@/lib/firebase/types';

type TwoChoiceR18SceneProps = {
  image: NonNullable<FirebaseBackAlleyPortfolioItem['image']>;
  interaction: NonNullable<FirebaseBackAlleyPortfolioItem['interaction']>;
};

export function TwoChoiceR18Scene({ image, interaction }: TwoChoiceR18SceneProps) {
  const [choice, setChoice] = useState<'top' | 'bottom' | null>(null);
  const [phase, setPhase] = useState<'initial' | 'fading' | 'result'>('initial');
  const initial = useProtectedImageSource(image.path);
  const top = useProtectedImageSource(interaction.top.image.path);
  const bottom = useProtectedImageSource(interaction.bottom.image.path);
  const failed = initial.failed || top.failed || bottom.failed;
  const ready = initial.src && top.src && bottom.src;

  useEffect(() => {
    if (!choice || phase !== 'fading') return;
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1600;
    const timer = window.setTimeout(() => setPhase('result'), delay);
    return () => window.clearTimeout(timer);
  }, [choice, phase]);

  const choose = (nextChoice: 'top' | 'bottom') => {
    setChoice(nextChoice);
    setPhase('fading');
  };

  const retry = () => {
    setChoice(null);
    setPhase('initial');
  };

  if (failed) return <span className="protected-image-status">画像を表示できません</span>;
  if (!ready) return <span className="protected-image-status">画像を読み込み中…</span>;

  return (
    <section className="two-choice-r18" aria-label={interaction.prompt}>
      <div className={cn('two-choice-r18-scene', phase === 'fading' && 'is-fading', phase === 'result' && 'is-result')}>
        {/* 3枚を先に認可取得することで、選択直後の切り替えを待機させずにフェードできる。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={initial.src!} alt={image.alt} className="two-choice-r18-image two-choice-r18-initial" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={top.src!} alt={interaction.top.image.alt} className={cn('two-choice-r18-image', 'two-choice-r18-result', phase === 'result' && choice === 'top' && 'is-visible')} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bottom.src!} alt={interaction.bottom.image.alt} className={cn('two-choice-r18-image', 'two-choice-r18-result', phase === 'result' && choice === 'bottom' && 'is-visible')} />
      </div>
      {choice ? (
        <div className="two-choice-r18-retry"><button type="button" className="pixel-button" onClick={retry}>選び直す</button></div>
      ) : (
        <div className="two-choice-r18-controls">
          <p>{interaction.prompt}</p>
          <div>
            <button type="button" className="pixel-button" onClick={() => choose('top')}>{interaction.top.label}</button>
            <button type="button" className="pixel-button" onClick={() => choose('bottom')}>{interaction.bottom.label}</button>
          </div>
        </div>
      )}
    </section>
  );
}
