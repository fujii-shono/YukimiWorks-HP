'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { MessageBody } from '@/components/messages/MessageBody';
import { formatMessageDate, getMessageImages, parseJapaneseDateTime, usePublicMessages } from '@/components/messages/usePublicMessages';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { cn } from '@/lib/format';

const RAINBOW_SHINE_ACTIVE_MS = 1_800;
const RAINBOW_SHINE_WAIT_MS = 1_000;

export function MessagePanel() {
  const tooltipBaseId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const postRefs = useRef<Array<HTMLElement | null>>([]);
  const [openPostIndex, setOpenPostIndex] = useState<number | null>(null);
  const [rainbowShineActive, setRainbowShineActive] = useState(false);
  const [tooltipTop, setTooltipTop] = useState(58);
  const [tooltipEnabled, setTooltipEnabled] = useState(false);

  const { now, posts } = usePublicMessages();

  useEffect(() => {
    let activeTimer: number | null = null;
    let waitTimer: number | null = null;
    let frame: number | null = null;

    const run = () => {
      setRainbowShineActive(false);
      frame = window.requestAnimationFrame(() => {
        setRainbowShineActive(true);
        activeTimer = window.setTimeout(() => {
          setRainbowShineActive(false);
          waitTimer = window.setTimeout(run, RAINBOW_SHINE_WAIT_MS);
        }, RAINBOW_SHINE_ACTIVE_MS);
      });
    };

    run();
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      if (activeTimer !== null) window.clearTimeout(activeTimer);
      if (waitTimer !== null) window.clearTimeout(waitTimer);
    };
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

  const visiblePosts = posts.slice(0, 10);
  const openPost = openPostIndex !== null ? visiblePosts[openPostIndex] : null;
  const visibleOpenPost = openPost && now && parseJapaneseDateTime(openPost.publishedAt).getTime() <= now.getTime() ? openPost : null;
  const openPostFormattedDate = visibleOpenPost && now ? formatMessageDate(visibleOpenPost.publishedAt, now) : '\u00a0';
  const openPostDateTime = openPost ? parseJapaneseDateTime(openPost.publishedAt).toISOString() : '';
  const openPostReplyFormattedDate = visibleOpenPost?.reply && now
    ? formatMessageDate(visibleOpenPost.reply.publishedAt, now)
    : '';

  return (
    <section ref={panelRef} className="window-panel message-panel" aria-label="メッセージ">
      <h2 className="window-title">
        <span className="title-deco" aria-hidden="true">
          ❄
        </span>
        <Link href="/messages" className="window-title-link">
          Message
        </Link>
        <span className="title-deco" aria-hidden="true">
          ❄
        </span>
      </h2>
      <div className="message-panel-list" tabIndex={0}>
        {visiblePosts.map((post, index) => {
          if (!now) return null;

          const tooltipId = `${tooltipBaseId}-${index}`;
          const formattedDate = formatMessageDate(post.publishedAt, now);
          const dateTime = parseJapaneseDateTime(post.publishedAt).toISOString();
          const open = openPostIndex === index;
          const postImages = getMessageImages(post);

          return (
            <article
              ref={(element) => {
                postRefs.current[index] = element;
              }}
              className={cn(
                'message-panel-post',
                post.tone && `message-panel-post-${post.tone}`,
                post.tone === 'rainbow' && rainbowShineActive && 'is-rainbow-shining',
              )}
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
                      {post.icon && !post.tone ? (
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
                      <span className="message-panel-body"><MessageBody body={post.body} interactive={false} /></span>
                      {postImages.length > 0 ? (
                        <span className="message-panel-summary-images">
                          {postImages.map((image) => (
                            <Image
                              key={image.src}
                              src={image.src}
                              alt={image.alt}
                              width={220}
                              height={140}
                              className="message-panel-thumb"
                              unoptimized
                            />
                          ))}
                        </span>
                      ) : null}
                    </span>
                    {post.reply ? (
                      <span className="message-panel-support-reply">
                        <span className="message-panel-meta message-panel-support-reply-meta">
                          <Image
                            src="/logo/yukimi_works_favicon.png"
                            alt="YukimiWorks"
                            width={26}
                            height={26}
                            className="message-panel-icon pixel-image"
                            unoptimized
                          />
                          <span className="message-panel-support-reply-author">{post.reply.authorName || 'YukimiWorks'}</span>
                        </span>
                        <span className="message-panel-support-reply-body">
                          <MessageBody body={post.reply.body} interactive={false} />
                        </span>
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            </article>
          );
        })}
        {posts.length > 10 ? (
          <div className="message-panel-more">
            <Link href="/messages">もっとメッセージを見る &raquo;</Link>
          </div>
        ) : null}
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
              {visibleOpenPost.icon && !visibleOpenPost.tone ? (
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
            <p
              className={cn(
                visibleOpenPost.tone && `message-panel-body-${visibleOpenPost.tone}`,
                visibleOpenPost.tone === 'rainbow' && rainbowShineActive && 'is-rainbow-shining',
              )}
            >
              <MessageBody body={visibleOpenPost.body} />
            </p>
            {getMessageImages(visibleOpenPost).map((image) => (
              <Image key={image.src} src={image.src} alt={image.alt} width={220} height={140} className="message-panel-tooltip-image" unoptimized />
            ))}
            {visibleOpenPost.reply ? (
              <div className="message-panel-support-reply message-panel-tooltip-reply">
                <div className="message-panel-meta message-panel-support-reply-meta">
                  <Image
                    src="/logo/yukimi_works_favicon.png"
                    alt="YukimiWorks"
                    width={26}
                    height={26}
                    className="message-panel-icon pixel-image"
                    unoptimized
                  />
                  <span className="message-panel-support-reply-author">{visibleOpenPost.reply.authorName || 'YukimiWorks'}</span>
                  <time dateTime={parseJapaneseDateTime(visibleOpenPost.reply.publishedAt).toISOString()}>
                    {openPostReplyFormattedDate}
                  </time>
                </div>
                <p className="message-panel-support-reply-body">
                  <MessageBody body={visibleOpenPost.reply.body} />
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
