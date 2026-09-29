'use client';

import { useEffect, useMemo, useState } from 'react';
import { messagePosts, type MessagePost } from '@/data/messages';
import { subscribeToFirebaseMessages } from '@/lib/firebase/messages';

function getTokyoDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getTokyoDateParts(date: Date) {
  const [year = '0', month = '0', day = '0'] = getTokyoDateKey(date).split('-');
  return { year: Number(year), month: Number(month), day: Number(day) };
}

function getCalendarDayDiff(from: ReturnType<typeof getTokyoDateParts>, to: ReturnType<typeof getTokyoDateParts>) {
  const fromDate = Date.UTC(from.year, from.month - 1, from.day);
  const toDate = Date.UTC(to.year, to.month - 1, to.day);
  return Math.max(0, Math.floor((toDate - fromDate) / 86_400_000));
}

function getCalendarMonthDiff(from: ReturnType<typeof getTokyoDateParts>, to: ReturnType<typeof getTokyoDateParts>) {
  const monthDiff = (to.year - from.year) * 12 + to.month - from.month;
  return to.day < from.day ? monthDiff - 1 : monthDiff;
}

export function parseJapaneseDateTime(value: string) {
  return new Date(`${value.trim().replace(' ', 'T')}:00+09:00`);
}

export const MESSAGE_SAVED_EVENT = 'yukimi-message-saved';

export function formatFirebaseDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

export function formatMessageDate(value: string, now: Date) {
  const publishedAt = parseJapaneseDateTime(value);
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - publishedAt.getTime()) / 60_000));

  if (elapsedMinutes < 60) return `${elapsedMinutes}分前`;
  if (elapsedMinutes < 1_440) return `${Math.floor(elapsedMinutes / 60)}時間前`;

  const publishedDateParts = getTokyoDateParts(publishedAt);
  const currentDateParts = getTokyoDateParts(now);
  const elapsedMonths = getCalendarMonthDiff(publishedDateParts, currentDateParts);

  if (elapsedMonths >= 12) return `${Math.floor(elapsedMonths / 12)}年前`;
  if (elapsedMonths >= 1) return `${elapsedMonths}ヶ月前`;
  return `${getCalendarDayDiff(publishedDateParts, currentDateParts)}日前`;
}

export function getMessageImages(post: MessagePost) {
  if (post.images?.length) return post.images;
  return post.image ? [post.image] : [];
}

export function publishSavedMessage(post: MessagePost) {
  window.dispatchEvent(new CustomEvent<MessagePost>(MESSAGE_SAVED_EVENT, { detail: post }));
}

export function usePublicMessages() {
  const [now, setNow] = useState<Date | null>(null);
  const [donationPosts, setDonationPosts] = useState<MessagePost[]>([]);
  const [firebasePosts, setFirebasePosts] = useState<MessagePost[]>([]);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      try {
        const response = await fetch('/api/messages', { cache: 'no-store' });
        if (!response.ok) return;
        const json = (await response.json()) as { bokinMessages?: MessagePost[] };
        if (!cancelled && Array.isArray(json.bokinMessages)) setDonationPosts(json.bokinMessages);
      } catch {
        return;
      }
    };

    void loadMessages();
    const timer = window.setInterval(loadMessages, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    return subscribeToFirebaseMessages((messages) => {
      setFirebasePosts(
        messages.map((message) => ({
          id: message.id,
          publishedAt: formatFirebaseDate(message.publishedAt.toDate()),
          body: message.body,
          icon: { src: '/logo/yukimi_works_favicon.png', alt: 'YukimiWorks' },
          images: message.images.map((image) => ({ src: image.url, alt: image.alt })),
        })),
      );
    });
  }, []);

  useEffect(() => {
    const onMessageSaved = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const post = event.detail as MessagePost;
      if (!post || typeof post.id !== 'string' || typeof post.body !== 'string' || typeof post.publishedAt !== 'string') return;

      setNow(new Date());
      setFirebasePosts((current) => [post, ...current.filter((currentPost) => currentPost.id !== post.id)]);
    };

    window.addEventListener(MESSAGE_SAVED_EVENT, onMessageSaved);
    return () => window.removeEventListener(MESSAGE_SAVED_EVENT, onMessageSaved);
  }, []);

  const posts = useMemo(() => {
    if (!now) return [];
    return [...messagePosts, ...donationPosts, ...firebasePosts]
      .filter((post) => parseJapaneseDateTime(post.publishedAt).getTime() <= now.getTime())
      .sort((a, b) => parseJapaneseDateTime(b.publishedAt).getTime() - parseJapaneseDateTime(a.publishedAt).getTime());
  }, [donationPosts, firebasePosts, now]);

  return { now, posts };
}
