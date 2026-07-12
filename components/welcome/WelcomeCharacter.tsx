'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { CharacterBubble } from '@/components/welcome/CharacterBubble';
import { useCharacterInteraction } from '@/components/welcome/useCharacterInteraction';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { cn } from '@/lib/format';

export function WelcomeCharacter() {
  const { message, polite, bubbleTail, isPoked, isPressed, onCharacterClick, absent, noResponse, sleepImage } =
    useCharacterInteraction();
  const { event } = useTimeTheme();
  const characterSrc = sleepImage ?? (isPoked ? '/character/poked.png' : '/character/default.png');
  const characterMask = event === 'sleep-warning' ? '/effects/eyes.png' : sleepImage ?? '/character/default.png';

  return (
    <div className="character-stage">
      <CharacterBubble message={message} polite={polite} bubbleTail={bubbleTail} centered={absent} />
      {absent ? null : (
        <button
          type="button"
          className="character-button"
          aria-label="キャラクターに話しかける"
          onClick={onCharacterClick}
          disabled={noResponse}
        >
          <span
            className={cn('character-press-target', 'pixel-tint-frame', 'pixel-tint-frame-character', isPressed && 'is-clicked')}
            style={{ '--pixel-mask': `url("${characterMask}")` } as CSSProperties}
          >
            <SleepWarningImage
              src={characterSrc}
              alt="YukimiWorksのキャラクター"
              width={111}
              height={135}
              className={cn('main-character pixel-image tinted-pixel-art', event !== 'sleep-warning' && 'pixel-art-silhouette')}
              unoptimized
              draggable={false}
            />
          </span>
        </button>
      )}
    </div>
  );
}
