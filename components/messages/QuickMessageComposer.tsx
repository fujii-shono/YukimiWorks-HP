'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { TrackingLinkBuilder } from '@/components/admin/TrackingLinkBuilder';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';
import { formatFirebaseDate, publishSavedMessage } from '@/components/messages/usePublicMessages';
import { MAX_MESSAGE_BODY_LENGTH, MAX_MESSAGE_IMAGES, saveFirebaseMessage } from '@/lib/firebase/messages';

export function QuickMessageComposer({ onClose }: { onClose: () => void }) {
  const { firebaseUser, profile } = useFirebaseAuth();
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);

  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length > MAX_MESSAGE_IMAGES) {
      setError(`画像は最大${MAX_MESSAGE_IMAGES}枚までです。`);
      event.target.value = '';
      return;
    }
    setFiles(selected);
    setError(null);
  };

  const insertTrackingLink = (trackingUrl: string) => {
    const input = bodyInputRef.current;
    const start = input?.selectionStart ?? body.length;
    const end = input?.selectionEnd ?? body.length;
    const before = body.slice(0, start);
    const after = body.slice(end);
    const insertion = `${before && !/\s$/.test(before) ? ' ' : ''}${trackingUrl}${after && !/^\s/.test(after) ? ' ' : ''}`;
    const nextBody = `${before}${insertion}${after}`;
    if (nextBody.length > MAX_MESSAGE_BODY_LENGTH) return `本文が${MAX_MESSAGE_BODY_LENGTH}文字を超えるため挿入できません。`;
    setBody(nextBody);
    requestAnimationFrame(() => {
      input?.focus();
      const nextCursor = start + insertion.length;
      input?.setSelectionRange(nextCursor, nextCursor);
    });
    return null;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (profile?.role !== 'admin' || !firebaseUser) {
      setError('管理者としてログインしてください。');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const publishedAt = new Date();
      const savedMessage = await saveFirebaseMessage({
        body,
        authorName: profile.displayName,
        publishedAt,
        existingImages: [],
        newFiles: files,
      });
      publishSavedMessage({
        id: savedMessage.id,
        publishedAt: formatFirebaseDate(publishedAt),
        body: body.trim(),
        authorName: profile.displayName,
        icon: { src: '/logo/yukimi_works_favicon.png', alt: 'YukimiWorks' },
        images: savedMessage.images.flatMap((image) => image.url ? [{ src: image.url, alt: image.alt }] : []),
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'メッセージを追加できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="messages-compose-backdrop" onMouseDown={() => !busy && onClose()}>
      <section
        className="messages-compose-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="messages-compose-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="messages-compose-heading">
          <h2 id="messages-compose-title">メッセージ追加</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="閉じる">×</button>
        </div>
        <form onSubmit={submit}>
          <label htmlFor="quick-message-body">メッセージ</label>
          <textarea
            id="quick-message-body"
            ref={bodyInputRef}
            value={body}
            rows={7}
            maxLength={MAX_MESSAGE_BODY_LENGTH}
            required
            autoFocus
            disabled={busy}
            onChange={(event) => setBody(event.target.value)}
          />
          <span className="admin-character-count">{body.length} / {MAX_MESSAGE_BODY_LENGTH}</span>

          <TrackingLinkBuilder onInsert={insertTrackingLink} disabled={busy} />

          <label htmlFor="quick-message-images">画像（最大4枚・1枚10MBまで）</label>
          <input id="quick-message-images" type="file" accept="image/*" multiple onChange={selectFiles} disabled={busy} />

          {previews.length > 0 ? (
            <div className="messages-compose-previews">
              {previews.map(({ file, url }) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={`${file.name}のプレビュー`} key={`${file.name}-${file.lastModified}`} />
              ))}
            </div>
          ) : null}

          <p className="messages-compose-time-note">公開日時は追加時の日時に自動設定されます。</p>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button type="submit" className="pixel-button messages-compose-submit" disabled={busy}>
            {busy ? '投稿中…' : '投稿'}
          </button>
        </form>
      </section>
    </div>
  );
}
