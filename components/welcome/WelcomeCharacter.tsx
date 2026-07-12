'use client';

import Image from 'next/image';
import { CharacterBubble } from '@/components/welcome/CharacterBubble';
import { useCharacterInteraction } from '@/components/welcome/useCharacterInteraction';
import { cn } from '@/lib/format';

export function WelcomeCharacter() {
  const { message, special, isPoked, isPressed, onCharacterClick } = useCharacterInteraction();

  return (
    <div className="character-stage">
      <CharacterBubble message={message} polite={special} />
      <button
        type="button"
        className={cn('character-button', isPressed && 'is-clicked')}
        aria-label="キャラクターに話しかける"
        onClick={onCharacterClick}
      >
        <Image
          src={isPoked ? '/character/poked.png' : '/character/default.png'}
          alt="YukimiWorksのキャラクター"
          width={111}
          height={135}
          className="main-character pixel-image pixel-art-silhouette"
          unoptimized
          draggable={false}
        />
      </button>
    </div>
  );
}
