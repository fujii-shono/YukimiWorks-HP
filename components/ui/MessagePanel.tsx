'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { messagePosts } from '@/data/messages';

function getTokyoDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function parseJapaneseDateTime(value: string) {
  const normalized = value.trim().replace(' ', 'T');
  return new Date(`${normalized}:00+09:00`);
}

function formatMessageDate(value: string, now: Date) {
  const publishedAt = parseJapaneseDateTime(value);
  const publishedDateKey = getTokyoDateKey(publishedAt);
  const currentDateKey = getTokyoDateKey(now);

  if (publishedDateKey === currentDateKey) {
    const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - publishedAt.getTime()) / 60_000));
    if (elapsedMinutes < 60) return `${elapsedMinutes}分前`;
    return `${Math.floor(elapsedMinutes / 60)}時間前`;
  }

  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(publishedAt);
}

export function MessagePanel() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="window-panel message-panel" aria-label="メッセージ">
      <h2 className="window-title">
        <span className="title-deco" aria-hidden="true">
          ❄
        </span>
        <span>Message</span>
        <span className="title-deco" aria-hidden="true">
          ❄
        </span>
      </h2>
      <div className="message-panel-list" tabIndex={0}>
        {messagePosts.map((post, index) => (
          <article className="message-panel-post" key={`${index}-${post.body}`}>
            <div className="message-panel-meta">
              {post.icon ? (
                <Image
                  src={post.icon.src}
                  alt={post.icon.alt}
                  width={26}
                  height={26}
                  className="message-panel-icon pixel-image"
                  unoptimized
                />
              ) : null}
              <time dateTime={parseJapaneseDateTime(post.publishedAt).toISOString()}>{now ? formatMessageDate(post.publishedAt, now) : '\u00a0'}</time>
            </div>
            <p>{post.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
