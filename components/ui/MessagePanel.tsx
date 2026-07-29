'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { messagePosts } from '@/data/messages';

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
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  };
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

function parseJapaneseDateTime(value: string) {
  const normalized = value.trim().replace(' ', 'T');
  return new Date(`${normalized}:00+09:00`);
}

function formatMessageDate(value: string, now: Date) {
  const publishedAt = parseJapaneseDateTime(value);
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - publishedAt.getTime()) / 60_000));

  if (elapsedMinutes < 60) return `${elapsedMinutes}分前`;
  if (elapsedMinutes < 1_440) return `${Math.floor(elapsedMinutes / 60)}時間前`;

  const publishedDateKey = getTokyoDateKey(publishedAt);
  const currentDateKey = getTokyoDateKey(now);

  if (publishedDateKey === currentDateKey) return `${Math.floor(elapsedMinutes / 60)}時間前`;

  const publishedDateParts = getTokyoDateParts(publishedAt);
  const currentDateParts = getTokyoDateParts(now);
  const elapsedMonths = getCalendarMonthDiff(publishedDateParts, currentDateParts);

  if (elapsedMonths >= 12) return `${Math.floor(elapsedMonths / 12)}年前`;
  if (elapsedMonths >= 1) return `${elapsedMonths}ヶ月前`;

  return `${getCalendarDayDiff(publishedDateParts, currentDateParts)}日前`;
}

export function MessagePanel() {
  const tooltipBaseId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const postRefs = useRef<Array<HTMLElement | null>>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [openPostIndex, setOpenPostIndex] = useState<number | null>(null);
  const [tooltipTop, setTooltipTop] = useState(58);
  const [tooltipEnabled, setTooltipEnabled] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = () => {
      setTooltipEnabled(query.matches);
      if (!query.matches) setOpenPostIndex(null);
    };

    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenPostIndex(null);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (openPostIndex === null) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.message-panel-tooltip, .message-panel-post-button')) return;
      setOpenPostIndex(null);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [openPostIndex]);

  const togglePost = (index: number) => {
    if (!tooltipEnabled) return;

    setOpenPostIndex((current) => {
      const next = current === index ? null : index;
      if (next !== null) {
        const panelRect = panelRef.current?.getBoundingClientRect();
        const postRect = postRefs.current[index]?.getBoundingClientRect();
        if (panelRect && postRect) setTooltipTop(Math.max(58, postRect.top - panelRect.top + 8));
      }
      return next;
    });
  };

  const openPost = openPostIndex !== null ? messagePosts[openPostIndex] : null;
  const visibleOpenPost = openPost && now && parseJapaneseDateTime(openPost.publishedAt).getTime() <= now.getTime() ? openPost : null;
  const openPostFormattedDate = visibleOpenPost && now ? formatMessageDate(visibleOpenPost.publishedAt, now) : '\u00a0';
  const openPostDateTime = openPost ? parseJapaneseDateTime(openPost.publishedAt).toISOString() : '';

  return (
    <section ref={panelRef} className="window-panel message-panel" aria-label="メッセージ">
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
        {messagePosts.map((post, index) => {
          if (!now || parseJapaneseDateTime(post.publishedAt).getTime() > now.getTime()) return null;

          const tooltipId = `${tooltipBaseId}-${index}`;
          const formattedDate = formatMessageDate(post.publishedAt, now);
          const dateTime = parseJapaneseDateTime(post.publishedAt).toISOString();
          const open = openPostIndex === index;

          return (
            <article
              ref={(element) => {
                postRefs.current[index] = element;
              }}
              className="message-panel-post"
              key={`${index}-${post.body}`}
            >
              <button
                type="button"
                className="message-panel-post-button"
                aria-expanded={open}
                aria-controls={tooltipId}
                onClick={() => togglePost(index)}
              >
                <span className="message-panel-summary">
                  <span className="message-panel-summary-main">
                    <span className="message-panel-meta">
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
                      <time dateTime={dateTime}>{formattedDate}</time>
                    </span>
                    <span className="message-panel-body-row">
                      <span className="message-panel-body">{post.body}</span>
                      {post.image ? (
                        <Image
                          src={post.image.src}
                          alt={post.image.alt}
                          width={220}
                          height={140}
                          className="message-panel-thumb"
                          unoptimized
                        />
                      ) : null}
                    </span>
                  </span>
                </span>
              </button>
            </article>
          );
        })}
      </div>

      {tooltipEnabled && visibleOpenPost && openPostIndex !== null ? (
        <div
          id={`${tooltipBaseId}-${openPostIndex}`}
          className="message-panel-tooltip"
          role="tooltip"
          style={{ '--message-tooltip-top': `${tooltipTop}px` } as CSSProperties}
        >
          <div className="message-panel-tooltip-content">
            <div className="message-panel-meta">
              {visibleOpenPost.icon ? (
                <Image
                  src={visibleOpenPost.icon.src}
                  alt={visibleOpenPost.icon.alt}
                  width={26}
                  height={26}
                  className="message-panel-icon pixel-image"
                  unoptimized
                />
              ) : null}
              <time dateTime={openPostDateTime}>{openPostFormattedDate}</time>
            </div>
            <p>{visibleOpenPost.body}</p>
            {visibleOpenPost.image ? (
              <Image
                src={visibleOpenPost.image.src}
                alt={visibleOpenPost.image.alt}
                width={220}
                height={140}
                className="message-panel-tooltip-image"
                unoptimized
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
