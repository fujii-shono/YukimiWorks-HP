'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { absentMessage, baseWelcomeMessages, clickMessageTable, timeBasedMessages } from '@/data/characterMessages';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';

function randomBetween(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function chooseOne(messages: readonly string[], lastIndexRef: { current: number }) {
  let index = Math.floor(Math.random() * messages.length);
  if (messages.length > 1 && index === lastIndexRef.current) index = (index + 1) % messages.length;
  lastIndexRef.current = index;
  return messages[index] ?? '';
}

export function useCharacterInteraction() {
  const { event, hour, absent, sleepMode } = useTimeTheme();
  const [message, setMessage] = useState<string | null>(null);
  const [polite, setPolite] = useState(false);
  const [bubbleTail, setBubbleTail] = useState(true);
  const [isPoked, setIsPoked] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const timers = useRef<number[]>([]);
  const animationTimers = useRef<number[]>([]);
  const lastIndex = useRef(-1);
  const clickTimestamps = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };

  const clearAnimationTimers = () => {
    animationTimers.current.forEach((timer) => window.clearTimeout(timer));
    animationTimers.current = [];
  };

  const getActiveStreakCount = useCallback(() => {
    const now = Date.now();
    clickTimestamps.current = clickTimestamps.current.filter((stamp) => now - stamp <= 6000);
    return clickTimestamps.current.length;
  }, []);

  const hasActiveTapSequence = useCallback(() => getActiveStreakCount() > 0, [getActiveStreakCount]);
  const absentLabel = event === 'lunch' ? '食事中' : event === 'late-night-away' ? '....' : absentMessage;

  const isNoResponse = absent;
  const sleepImage = hour >= 0 && hour < 5 ? '/character/sleeping.png' : null;
  const timeAwareWelcomeMessages = useMemo(() => {
    const helloReplacement = hour >= 5 && hour < 7 ? 'おはようございます' : hour >= 19 ? 'こんばんは' : 'こんにちは';
    return baseWelcomeMessages.map((message) => (message === 'こんにちは' ? helloReplacement : message));
  }, [hour]);

  const currentMessagePool = useMemo(() => {
    if (hour >= 0 && hour < 5) return timeBasedMessages.sleeping;
    if (hour >= 5 && hour < 7) return [...timeAwareWelcomeMessages, ...timeBasedMessages.earlyMorning];
    if (hour >= 12 && hour < 13) return [...timeAwareWelcomeMessages, ...timeBasedMessages.day];
    if (hour >= 15 && hour < 16) return [...timeAwareWelcomeMessages, ...timeBasedMessages.snackHour];
    if (hour >= 17 && hour < 19) return [...timeAwareWelcomeMessages, ...timeBasedMessages.evening];
    if (hour >= 21 && hour < 24) return [...timeAwareWelcomeMessages, ...timeBasedMessages.night, ...timeBasedMessages.lateNight];
    if (hour >= 19 && hour < 21) return [...timeAwareWelcomeMessages, ...timeBasedMessages.night];
    return timeAwareWelcomeMessages;
  }, [hour, timeAwareWelcomeMessages]);

  const scheduleBubbleLoop = useCallback(() => {
    if (absent) {
      setMessage(absentLabel);
      setBubbleTail(false);
      setPolite(false);
      return;
    }

    if (event === 'sleep-warning') {
      setMessage(null);
      setBubbleTail(false);
      setPolite(false);
      return;
    }

    const queueNextLoop = () => {
      const delay = randomBetween(4_000, 9_000);
      timers.current.push(
        window.setTimeout(() => {
          if (hasActiveTapSequence()) {
            queueNextLoop();
            return;
          }

          const nextMessage = chooseOne(currentMessagePool, lastIndex);
          setMessage(nextMessage);
          setBubbleTail(true);
          setPolite(false);
          timers.current.push(
            window.setTimeout(() => {
              setMessage(null);
              queueNextLoop();
            }, 2_500),
          );
        }, delay),
      );
    };

    const firstMessage = chooseOne(currentMessagePool, lastIndex);
    setMessage(firstMessage);
    setBubbleTail(true);
    setPolite(false);
    timers.current.push(
      window.setTimeout(() => {
        setMessage(null);
        queueNextLoop();
      }, 2_500),
    );
  }, [absent, absentLabel, currentMessagePool, event, hasActiveTapSequence]);

  useEffect(() => {
    clearTimers();
    clickTimestamps.current = [];
    scheduleBubbleLoop();
    return () => {
      clearTimers();
      clearAnimationTimers();
    };
  }, [scheduleBubbleLoop]);

  const triggerSpecialMessage = (nextMessage: string) => {
    clearTimers();
    setMessage(nextMessage);
    setBubbleTail(true);
    setPolite(true);
    timers.current.push(
      window.setTimeout(() => {
        setMessage(null);
        setPolite(false);
        scheduleBubbleLoop();
      }, 2_500),
    );
  };

  const onCharacterClick = () => {
    if (absent) return;

    setIsPoked(true);
    setIsPressed(true);
    clearAnimationTimers();
    animationTimers.current.push(window.setTimeout(() => setIsPressed(false), 140));
    animationTimers.current.push(window.setTimeout(() => setIsPoked(false), 140));

    if (event === 'sleep-warning') {
      clearTimers();
      setMessage(null);
      setBubbleTail(false);
      setPolite(false);
      return;
    }

    if (sleepMode) {
      clearTimers();
      setMessage(timeBasedMessages.sleeping[0]);
      setBubbleTail(true);
      setPolite(false);
      timers.current.push(
        window.setTimeout(() => {
          setMessage(null);
          scheduleBubbleLoop();
        }, 2_500),
      );
      return;
    }

    const now = Date.now();
    clickTimestamps.current = [...clickTimestamps.current.filter((stamp) => now - stamp <= 6000), now];
    const count = clickTimestamps.current.length;

    if (count >= 30) {
      const roll = Math.random() * 100;
      const match = clickMessageTable.bored.find((item) => roll < item.max);
      if (match) triggerSpecialMessage(match.message);
      return;
    }

    if (count >= 8) {
      const roll = Math.random() * 100;
      const match = clickMessageTable.warning.find((item) => roll < item.max);
      if (match) triggerSpecialMessage(match.message);
    }
  };

  return {
    message: absent ? absentLabel : message,
    polite,
    bubbleTail,
    isPoked,
    isPressed,
    onCharacterClick,
    absent,
    sleepMode,
    noResponse: isNoResponse,
    sleepImage,
  };
}
