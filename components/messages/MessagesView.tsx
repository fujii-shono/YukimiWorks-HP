'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';
import { MessageBody } from '@/components/messages/MessageBody';
import { MessageSupportForm } from '@/components/messages/MessageSupportForm';
import { QuickMessageComposer } from '@/components/messages/QuickMessageComposer';
import {
  formatMessageDate,
  getMessageImages,
  parseJapaneseDateTime,
  publishSupportReply,
  usePublicMessages,
} from '@/components/messages/usePublicMessages';
import { MAX_MESSAGE_SUPPORT_REPLY_LENGTH, type MessagePost } from '@/data/messages';
import { cn } from '@/lib/format';

const PAGE_SIZE = 10;
const tabs = [
  { id: 'messages', label: 'メッセージ' },
  { id: 'media', label: 'メディア' },
  { id: 'support', label: '支援' },
] as const;

type MessageTab = (typeof tabs)[number]['id'];
type SelectedImage = {
  src: string;
  alt: string;
  body: string;
};

function MessageFeed({
  posts,
  now,
  isAdmin,
  onReply,
  onSelectImage,
}: {
  posts: MessagePost[];
  now: Date;
  isAdmin: boolean;
  onReply: (post: MessagePost) => void;
  onSelectImage: (image: SelectedImage) => void;
}) {
  return (
    <div className="messages-feed">
      {posts.map((post, postIndex) => {
        const images = getMessageImages(post);
        const singleImage = images.length === 1 ? images[0] : null;
        return (
          <article
            className={cn('messages-feed-post', post.tone && `message-panel-post-${post.tone}`)}
            key={`${post.publishedAt}-${postIndex}-${post.body}`}
          >
            <header className="message-panel-meta">
              {post.icon && !post.tone ? (
                <Image src={post.icon.src} alt={post.icon.alt} width={36} height={36} className="messages-feed-icon pixel-image" unoptimized />
              ) : null}
              <time dateTime={parseJapaneseDateTime(post.publishedAt).toISOString()}>{formatMessageDate(post.publishedAt, now)}</time>
            </header>
            <div className="messages-feed-body-row">
              <p className={cn('message-panel-body', post.tone && `message-panel-body-${post.tone}`)}><MessageBody body={post.body} /></p>
              {singleImage ? (
                <button
                  type="button"
                  className="messages-feed-image-button messages-feed-single-image"
                  onClick={() => onSelectImage({ ...singleImage, body: post.body })}
                  aria-label={`${singleImage.alt || 'メッセージ添付画像'}を拡大表示`}
                >
                  <Image src={singleImage.src} alt={singleImage.alt} width={96} height={96} unoptimized />
                </button>
              ) : null}
            </div>
            {images.length > 1 ? (
              <div className="messages-feed-images">
                {images.map((image, imageIndex) => (
                  <button
                    type="button"
                    className="messages-feed-image-button"
                    key={`${image.src}-${imageIndex}`}
                    onClick={() => onSelectImage({ ...image, body: post.body })}
                    aria-label={`${image.alt || 'メッセージ添付画像'}を拡大表示`}
                  >
                    <Image src={image.src} alt={image.alt} width={160} height={160} unoptimized />
                  </button>
                ))}
              </div>
            ) : null}
            {post.reply ? (
              <div className="messages-support-reply">
                <div className="message-panel-meta messages-support-reply-meta">
                  <Image
                    src="/logo/yukimi_works_favicon.png"
                    alt="YukimiWorks"
                    width={36}
                    height={36}
                    className="messages-feed-icon pixel-image"
                    unoptimized
                  />
                  <span className="messages-reply-author">{post.reply.authorName || 'YukimiWorks'}</span>
                  <time dateTime={parseJapaneseDateTime(post.reply.publishedAt).toISOString()}>
                    {formatMessageDate(post.reply.publishedAt, now)}
                  </time>
                  {isAdmin && post.tone && post.id ? (
                    <button
                      type="button"
                      className="messages-reply-button"
                      onClick={() => onReply(post)}
                      aria-label="このリプライを編集する"
                      title="リプライを編集する"
                    >
                      <span aria-hidden="true">✎</span>
                    </button>
                  ) : null}
                </div>
                <p><MessageBody body={post.reply.body} /></p>
              </div>
            ) : null}
            {isAdmin && post.tone && post.id && !post.reply ? (
              <button
                type="button"
                className="messages-reply-button"
                onClick={() => onReply(post)}
                aria-label="この支援メッセージにリプライする"
                title="リプライする"
              >
                <span aria-hidden="true">↩</span>
              </button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function SupportReplyModal({
  post,
  getIdToken,
  onClose,
}: {
  post: MessagePost;
  getIdToken: () => Promise<string>;
  onClose: () => void;
}) {
  const editing = Boolean(post.reply);
  const [body, setBody] = useState(post.reply?.body ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!post.id) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/messages/support-replies/${encodeURIComponent(post.id)}`, {
        method: editing ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${await getIdToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body }),
      });
      const result = (await response.json().catch(() => null)) as {
        messageId?: string;
        reply?: { body?: string; publishedAt?: string; authorName?: string };
        error?: string;
      } | null;
      if (!response.ok || !result?.messageId || typeof result.reply?.body !== 'string' || typeof result.reply.publishedAt !== 'string') {
        throw new Error(result?.error || 'リプライを保存できませんでした。');
      }

      publishSupportReply(result.messageId, {
        body: result.reply.body,
        publishedAt: result.reply.publishedAt,
        ...(typeof result.reply.authorName === 'string' ? { authorName: result.reply.authorName } : {}),
      });
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'リプライを保存できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="messages-compose-backdrop" onMouseDown={() => !busy && onClose()}>
      <section
        className="messages-compose-modal messages-reply-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="messages-reply-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="messages-compose-heading">
          <h2 id="messages-reply-title">{editing ? 'リプライを編集' : '支援メッセージへリプライ'}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="閉じる">×</button>
        </div>
        <p className="messages-reply-target">{post.body}</p>
        <form onSubmit={submit}>
          <label htmlFor="messages-reply-body">リプライ</label>
          <textarea
            id="messages-reply-body"
            value={body}
            rows={6}
            maxLength={MAX_MESSAGE_SUPPORT_REPLY_LENGTH}
            required
            autoFocus
            disabled={busy}
            onChange={(event) => setBody(event.target.value)}
          />
          <span className="admin-character-count">{body.length} / {MAX_MESSAGE_SUPPORT_REPLY_LENGTH}</span>
          {error ? <p className="form-status error" role="alert">{error}</p> : null}
          <button type="submit" className="primary-button messages-compose-submit" disabled={busy}>
            {busy ? '保存中…' : editing ? '更新' : 'リプライ'}
          </button>
        </form>
      </section>
    </div>
  );
}

export function MessagesView() {
  const { now, posts } = usePublicMessages();
  const { firebaseUser, loading, profile, profileLoading } = useFirebaseAuth();
  const [activeTab, setActiveTab] = useState<MessageTab>('messages');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessagePost | null>(null);
  const [poweredOff, setPoweredOff] = useState(false);
  const phoneShellRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const supportPosts = useMemo(() => posts.filter((post) => Boolean(post.tone)), [posts]);
  const activePosts = activeTab === 'support' ? supportPosts : posts;
  const visiblePosts = activePosts.slice(0, visibleCount);
  const hasMore = visibleCount < activePosts.length;
  const media = useMemo(
    () =>
      posts.flatMap((post, postIndex) =>
        getMessageImages(post).map((image, imageIndex) => ({
          ...image,
          body: post.body,
          key: `${post.publishedAt}-${postIndex}-${imageIndex}-${image.src}`,
        })),
      ),
    [posts],
  );
  const showSupportAction = !loading && !profileLoading && profile?.role !== 'admin';

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab]);

  useEffect(() => {
    if (profile?.role !== 'admin') {
      setComposerOpen(false);
      setReplyingTo(null);
    }
  }, [profile?.role]);

  const togglePower = () => {
    if (!poweredOff) {
      phoneShellRef.current?.scrollTo({ top: 0 });
      setComposerOpen(false);
      setReplyingTo(null);
    }
    setPoweredOff((current) => !current);
  };

  useEffect(() => {
    if (!hasMore || activeTab === 'media') return;
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisibleCount((count) => Math.min(count + PAGE_SIZE, activePosts.length));
      },
      { root: phoneShellRef.current, rootMargin: '160px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [activePosts.length, activeTab, hasMore]);

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

  return (
    <>
      <div
        className={cn(
          'messages-phone-frame',
          profile?.role === 'admin' && 'has-admin-compose',
          showSupportAction && 'has-support-action',
        )}
      >
        <div ref={phoneShellRef} className={cn('messages-phone-shell', poweredOff && 'is-powered-off')}>
          <div className="messages-tabs" role="tablist" aria-label="Message表示切り替え">
            {tabs.map((tab) => (
              <button
                type="button"
                role="tab"
                id={`messages-tab-${tab.id}`}
                aria-controls={`messages-panel-${tab.id}`}
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? 'active' : undefined}
                onClick={() => setActiveTab(tab.id)}
                key={tab.id}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div id={`messages-panel-${activeTab}`} role="tabpanel" aria-labelledby={`messages-tab-${activeTab}`} className="messages-tab-panel">
            {!now ? <p className="empty-state">メッセージを読み込んでいます…</p> : null}

            {now && activeTab !== 'media' && visiblePosts.length > 0 ? (
              <MessageFeed
                posts={visiblePosts}
                now={now}
                isAdmin={profile?.role === 'admin'}
                onReply={(post) => {
                  setComposerOpen(false);
                  setReplyingTo(post);
                }}
                onSelectImage={setSelectedImage}
              />
            ) : null}

            {now && activeTab !== 'media' && activePosts.length === 0 ? (
              <p className="empty-state">{activeTab === 'support' ? '支援メッセージはまだありません' : 'メッセージはまだありません'}</p>
            ) : null}

            {now && activeTab === 'media' && media.length > 0 ? (
              <div className="messages-media-grid">
                {media.map((item) => (
                  <button
                    type="button"
                    className="messages-media-button"
                    key={item.key}
                    onClick={() => setSelectedImage(item)}
                    aria-label={`${item.alt || 'メッセージ添付画像'}を拡大表示`}
                  >
                    <Image src={item.src} alt={item.alt} fill sizes="(max-width: 767px) 33vw, 220px" unoptimized />
                  </button>
                ))}
              </div>
            ) : null}

            {now && activeTab === 'media' && media.length === 0 ? <p className="empty-state">メディアはまだありません</p> : null}

            {activeTab !== 'media' && hasMore ? (
              <div ref={loadMoreRef} className="messages-load-more" aria-label="過去のメッセージを追加読み込み">
                <span>読み込み中…</span>
              </div>
            ) : null}
          </div>
          {poweredOff ? <div className="messages-phone-off-screen" aria-label="スマートフォン画面は電源オフです" /> : null}
        </div>
        <button
          type="button"
          className={cn('messages-power-button', poweredOff && 'is-powered-off')}
          onClick={togglePower}
          aria-pressed={poweredOff}
          aria-label={poweredOff ? 'スマートフォンの電源を入れる' : 'スマートフォンの電源を切る'}
        />
        {profile?.role === 'admin' && !poweredOff ? (
          <button
            type="button"
            className="messages-compose-button"
            onClick={() => {
              setReplyingTo(null);
              setComposerOpen(true);
            }}
            aria-label="メッセージを追加"
          >
            +
          </button>
        ) : null}
        {composerOpen && !poweredOff ? <QuickMessageComposer onClose={() => setComposerOpen(false)} /> : null}
        {replyingTo && firebaseUser && !poweredOff ? (
          <SupportReplyModal
            post={replyingTo}
            getIdToken={() => firebaseUser.getIdToken()}
            onClose={() => setReplyingTo(null)}
          />
        ) : null}
        {showSupportAction && !poweredOff ? <MessageSupportForm /> : null}
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
    </>
  );
}
