'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { MessageBody } from '@/components/messages/MessageBody';
import { formatMessageDate, getMessageImages, parseJapaneseDateTime, usePublicMessages } from '@/components/messages/usePublicMessages';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { cn } from '@/lib/format';

const RAINBOW_SHINE_ACTIVE_MS = 1_800;
const RAINBOW_SHINE_WAIT_MS = 1_000;

export function MessagePanel() {
  const [rainbowShineActive, setRainbowShineActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string; body: string } | null>(null);

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
    if (!selectedImage) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedImage(null);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedImage]);

  const visiblePosts = posts.slice(0, 10);

  return (
    <section className="window-panel message-panel" aria-label="メッセージ">
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

          const formattedDate = formatMessageDate(post.publishedAt, now);
          const dateTime = parseJapaneseDateTime(post.publishedAt).toISOString();
          const postImages = getMessageImages(post);

          return (
            <article
              className={cn(
                'message-panel-post',
                post.tone && `message-panel-post-${post.tone}`,
                post.tone === 'rainbow' && rainbowShineActive && 'is-rainbow-shining',
              )}
              key={`${index}-${post.body}`}
            >
              <div className="message-panel-summary">
                <div className="message-panel-summary-main">
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
                      {post.icon && !post.tone ? <span className="message-panel-author">{post.authorName || post.icon.alt}</span> : null}
                      <time dateTime={dateTime}>{formattedDate}</time>
                    </span>
                    <span className="message-panel-body-row">
                      <span className="message-panel-body"><MessageBody body={post.body} /></span>
                      {postImages.length > 0 ? (
                        <span className="message-panel-summary-images">
                          {postImages.map((image, imageIndex) => (
                            <button
                              type="button"
                              className="message-panel-image-button"
                              key={`${image.src}-${imageIndex}`}
                              onClick={() => setSelectedImage({ ...image, body: post.body })}
                              aria-label={`${image.alt || 'メッセージ添付画像'}を拡大表示`}
                            >
                              <Image
                                src={image.src}
                                alt={image.alt}
                                width={220}
                                height={140}
                                className="message-panel-thumb"
                                unoptimized
                              />
                            </button>
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
                          <MessageBody body={post.reply.body} />
                        </span>
                      </span>
                    ) : null}
                </div>
              </div>
            </article>
          );
        })}
        {posts.length > 10 ? (
          <div className="message-panel-more">
            <Link href="/messages">もっとメッセージを見る &raquo;</Link>
          </div>
        ) : null}
      </div>

      {selectedImage ? (
        <div className="messages-image-modal-backdrop" onMouseDown={() => setSelectedImage(null)}>
          <section
            className="messages-image-modal"
            role="dialog"
            aria-modal="true"
            aria-label="メッセージ画像の拡大表示"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="messages-image-modal-close" onClick={() => setSelectedImage(null)} autoFocus aria-label="閉じる">
              ×
            </button>
            <Image src={selectedImage.src} alt={selectedImage.alt} width={1200} height={900} className="messages-image-modal-image" unoptimized />
            <p><MessageBody body={selectedImage.body} /></p>
          </section>
        </div>
      ) : null}
    </section>
  );
}
