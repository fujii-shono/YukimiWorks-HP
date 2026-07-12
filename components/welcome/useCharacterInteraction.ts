'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clickMessageTable, welcomeMessages } from '@/data/characterMessages';

function randomBetween(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function useCharacterInteraction() {
  const [message, setMessage] = useState<string | null>(null);
  const [special, setSpecial] = useState(false);
  const [isPoked, setIsPoked] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const regularTimer = useRef<number | null>(null);
  const bubbleTimer = useRef<number | null>(null);
  const pokeTimer = useRef<number | null>(null);
  const pressTimer = useRef<number | null>(null);
  const scheduleRef = useRef<(delay?: number) => void>(() => {});
  const lastMessageIndex = useRef(-1);
  const specialMessageActive = useRef(false);

  const clearAll = () => {
    [regularTimer, bubbleTimer, pokeTimer, pressTimer].forEach((timerRef) => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    });
  };

  const showBubble = useCallback((nextMessage: string, duration: number, isSpecial: boolean) => {
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    setMessage(nextMessage);
    setSpecial(isSpecial);
    bubbleTimer.current = window.setTimeout(() => {
      setMessage(null);
      if (isSpecial) {
        specialMessageActive.current = false;
        scheduleRef.current(randomBetween(10_000, 18_000));
      }
    }, duration);
  }, []);

  const chooseRegularMessage = useCallback(() => {
    let index = Math.floor(Math.random() * welcomeMessages.length);
    if (welcomeMessages.length > 1 && index === lastMessageIndex.current) {
      index = (index + 1 + Math.floor(Math.random() * (welcomeMessages.length - 1))) % welcomeMessages.length;
    }
    lastMessageIndex.current = index;
    return welcomeMessages[index];
  }, []);

  useEffect(() => {
    const scheduleRegularMessage = (delay = 5_000) => {
      if (regularTimer.current) window.clearTimeout(regularTimer.current);
      regularTimer.current = window.setTimeout(() => {
        if (document.hidden || specialMessageActive.current) {
          scheduleRegularMessage(2_000);
          return;
        }
        showBubble(chooseRegularMessage(), 4_000, false);
        scheduleRegularMessage(4_000 + randomBetween(10_000, 18_000));
      }, delay);
    };

    scheduleRef.current = scheduleRegularMessage;
    scheduleRegularMessage();
    const onVisible = () => {
      if (!document.hidden && !specialMessageActive.current) scheduleRef.current(2_000);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearAll();
    };
  }, [chooseRegularMessage, showBubble]);

  const onCharacterClick = () => {
    setIsPoked(true);
    setIsPressed(true);
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => setIsPressed(false), 140);
    if (pokeTimer.current) window.clearTimeout(pokeTimer.current);
    pokeTimer.current = window.setTimeout(() => setIsPoked(false), 140);

    const roll = Math.random() * 100;
    const specialMessage = clickMessageTable.find((entry) => roll < entry.max)?.message ?? null;
    if (specialMessage) {
      specialMessageActive.current = true;
      if (regularTimer.current) window.clearTimeout(regularTimer.current);
      showBubble(specialMessage, 3_000, true);
    }
  };

  return {
    message,
    special,
    isPoked,
    isPressed,
    onCharacterClick,
  };
}
