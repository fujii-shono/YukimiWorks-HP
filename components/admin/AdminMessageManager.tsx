'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';
import { AdminTrafficAnalytics } from '@/components/admin/AdminTrafficAnalytics';
import { AdminContentManager } from '@/components/admin/AdminContentManager';
import { AdminLinkManager } from '@/components/admin/AdminLinkManager';
import { TrackingLinkBuilder } from '@/components/admin/TrackingLinkBuilder';
import { ProtectedImage } from '@/components/back-alley/ProtectedImage';
import {
  deleteFirebaseMessage,
  deleteMessageImages,
  MAX_MESSAGE_BODY_LENGTH,
  MAX_MESSAGE_IMAGES,
  saveFirebaseMessage,
  subscribeToFirebaseMessages,
} from '@/lib/firebase/messages';
import type { FirebaseMessage, FirebaseMessageImage } from '@/lib/firebase/types';

const adminSections = [
  { id: 'messages', label: 'メッセージ' },
  { id: 'works', label: '作品' },
  { id: 'goods', label: 'グッズ' },
  { id: 'links', label: 'リンク集' },
  { id: 'news', label: 'ニュース' },
  { id: 'analytics', label: 'アクセス分析' },
] as const;

type AdminSection = (typeof adminSections)[number]['id'];
type MessageView = 'list' | 'new' | 'edit';

function toTokyoDateTimeInput(date: Date) {
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
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function initialPublishedAt() {
  return toTokyoDateTimeInput(new Date());
}

export function AdminMessageManager({ basePath = '/admin' }: { basePath?: '/admin' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firebaseUser, profile, loading, profileLoading } = useFirebaseAuth();
  const [messages, setMessages] = useState<FirebaseMessage[]>([]);
  const [body, setBody] = useState('');
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [existingImages, setExistingImages] = useState<FirebaseMessageImage[]>([]);
  const [removedImages, setRemovedImages] = useState<FirebaseMessageImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hydratedFormKey = useRef<string | null>(null);
  const bodyInputRef = useRef<HTMLTextAreaElement | null>(null);

  const isAdmin = profile?.role === 'admin';
  const sectionValue = searchParams.get('section');
  const activeSection: AdminSection | null = adminSections.some((section) => section.id === sectionValue)
    ? (sectionValue as AdminSection)
    : null;
  const modeValue = searchParams.get('mode');
  const requestedEditingId = searchParams.get('id');
  const messageView: MessageView =
    activeSection === 'messages' && modeValue === 'new'
      ? 'new'
      : activeSection === 'messages' && modeValue === 'edit' && requestedEditingId
        ? 'edit'
        : 'list';
  const editingId = messageView === 'edit' ? requestedEditingId : null;
  const newFilePreviews = useMemo(() => newFiles.map((file) => ({ file, url: URL.createObjectURL(file) })), [newFiles]);

  useEffect(() => () => newFilePreviews.forEach(({ url }) => URL.revokeObjectURL(url)), [newFilePreviews]);

  useEffect(() => {
    if (!isAdmin || activeSection !== 'messages') return;
    return subscribeToFirebaseMessages(setMessages, () => setError('メッセージ一覧を読み込めませんでした。'));
  }, [activeSection, isAdmin]);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!firebaseUser || !isAdmin) router.replace('/');
  }, [firebaseUser, isAdmin, loading, profileLoading, router]);

  useEffect(() => {
    if (activeSection !== 'messages') return;

    const formKey = `${messageView}:${editingId ?? ''}`;
    if (hydratedFormKey.current === formKey) return;

    if (messageView === 'edit') {
      const message = messages.find((item) => item.id === editingId);
      if (!message) return;
      setBody(message.body);
      setPublishedAt(toTokyoDateTimeInput(message.publishedAt.toDate()));
      setExistingImages(message.images);
      setRemovedImages([]);
      setNewFiles([]);
      setError(null);
    } else {
      setBody('');
      setPublishedAt(initialPublishedAt());
      setExistingImages([]);
      setRemovedImages([]);
      setNewFiles([]);
      setError(null);
    }

    hydratedFormKey.current = formKey;
  }, [activeSection, editingId, messageView, messages]);

  const resetForm = () => {
    hydratedFormKey.current = null;
    setBody('');
    setPublishedAt(initialPublishedAt());
    setExistingImages([]);
    setRemovedImages([]);
    setNewFiles([]);
    setError(null);
  };

  const openMessages = () => {
    setNotice(null);
    resetForm();
    router.push(`${basePath}?section=messages`);
  };

  const openNewMessage = () => {
    resetForm();
    setNotice(null);
    router.push(`${basePath}?section=messages&mode=new`);
  };

  const editMessage = (message: FirebaseMessage) => {
    setNotice(null);
    setError(null);
    router.push(`${basePath}?section=messages&mode=edit&id=${encodeURIComponent(message.id)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length + existingImages.length > MAX_MESSAGE_IMAGES) {
      setError(`画像は既存分を含めて最大${MAX_MESSAGE_IMAGES}枚までです。`);
      event.target.value = '';
      return;
    }
    setNewFiles(selected);
    setError(null);
  };

  const removeExistingImage = (image: FirebaseMessageImage) => {
    setExistingImages((current) => current.filter((item) => item.path !== image.path));
    setRemovedImages((current) => [...current, image]);
  };

  const insertTrackingLink = (trackingUrl: string) => {
    const input = bodyInputRef.current;
    const start = input?.selectionStart ?? body.length;
    const end = input?.selectionEnd ?? body.length;
    const before = body.slice(0, start);
    const after = body.slice(end);
    const leadingSpace = before && !/\s$/.test(before) ? ' ' : '';
    const trailingSpace = after && !/^\s/.test(after) ? ' ' : '';
    const insertion = `${leadingSpace}${trackingUrl}${trailingSpace}`;
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
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await saveFirebaseMessage({
        id: editingId || undefined,
        body,
        authorName: profile?.displayName ?? '管理者',
        publishedAt: new Date(`${publishedAt}:00+09:00`),
        existingImages,
        newFiles,
      });
      if (removedImages.length > 0) await deleteMessageImages(removedImages);
      const nextNotice = editingId ? 'メッセージを更新しました。' : 'メッセージを追加しました。';
      resetForm();
      setNotice(nextNotice);
      router.push(`${basePath}?section=messages`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'メッセージを保存できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  const removeMessage = async (message: FirebaseMessage) => {
    if (!window.confirm('このメッセージを削除しますか？')) return;
    setBusy(true);
    setError(null);
    try {
      await deleteFirebaseMessage(message);
      setNotice('メッセージを削除しました。');
    } catch {
      setError('メッセージを削除できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  const backToDashboard = () => {
    resetForm();
    setNotice(null);
    router.push(basePath);
  };

  if (loading || profileLoading) return <p className="admin-access-message">ログイン情報を確認しています…</p>;
  if (!firebaseUser || !isAdmin) return <p className="admin-access-message">トップページへ移動します…</p>;

  if (activeSection === null) {
    return (
      <div className="admin-dashboard">
        <p>管理する項目を選択してください。</p>
        <div className="admin-section-grid">
          {adminSections.map((section) => (
            <button
              type="button"
              key={section.id}
              className="pixel-button admin-section-button"
              onClick={() => (section.id === 'messages' ? openMessages() : router.push(`${basePath}?section=${section.id}`))}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (activeSection === 'analytics') {
    return <AdminTrafficAnalytics onBack={backToDashboard} />;
  }

  if (activeSection === 'links') {
    return <AdminLinkManager onBack={backToDashboard} />;
  }

  if (activeSection !== 'messages') {
    return <AdminContentManager kind={activeSection as 'works' | 'goods' | 'news'} onBack={backToDashboard} />;
  }

  return (
    <div className="admin-message-manager">
      <div className="admin-subpage-header">
        <h2>メッセージ</h2>
        <button type="button" onClick={backToDashboard} disabled={busy}>管理項目へ戻る</button>
      </div>

      {messageView === 'list' ? (
        <section className="admin-message-list" aria-label="登録済みメッセージ">
          <div className="admin-list-heading">
            <h3>メッセージ一覧</h3>
            <button type="button" className="pixel-button" onClick={openNewMessage} disabled={busy}>新規追加</button>
          </div>
          {notice ? <p className="form-success">{notice}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {messages.length === 0 ? <p>登録済みメッセージはありません。</p> : null}
          {messages.map((message) => (
            <article key={message.id}>
              <time dateTime={message.publishedAt.toDate().toISOString()}>
                {message.publishedAt.toDate().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </time>
              <p>{message.body}</p>
              <span>
                {message.images.length > 0 ? `画像 ${message.images.length}枚` : '画像なし'}
              </span>
              <div>
                <button type="button" onClick={() => editMessage(message)} disabled={busy}>編集</button>
                <button type="button" onClick={() => void removeMessage(message)} disabled={busy}>削除</button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <form className="admin-message-form" onSubmit={submit}>
          <div className="admin-list-heading">
            <h3>{messageView === 'edit' ? 'メッセージ編集' : '新しいメッセージ'}</h3>
            <button type="button" onClick={() => { resetForm(); router.push(`${basePath}?section=messages`); }} disabled={busy}>一覧へ戻る</button>
          </div>
          <label htmlFor="admin-message-body">本文</label>
          <textarea
            id="admin-message-body"
            ref={bodyInputRef}
            value={body}
            rows={9}
            maxLength={MAX_MESSAGE_BODY_LENGTH}
            required
            placeholder={'ここで改行できます。\n絵文字も使用できます ❄️'}
            onChange={(event) => setBody(event.target.value)}
          />
          <span className="admin-character-count">{body.length} / {MAX_MESSAGE_BODY_LENGTH}</span>

          <TrackingLinkBuilder onInsert={insertTrackingLink} disabled={busy} />

          <label htmlFor="admin-message-published-at">公開日時（日本時間）</label>
          <input
            id="admin-message-published-at"
            type="datetime-local"
            value={publishedAt}
            required
            onChange={(event) => setPublishedAt(event.target.value)}
          />

          <label htmlFor="admin-message-images">画像（最大4枚・1枚10MBまで）</label>
          <input
            id="admin-message-images"
            type="file"
            accept="image/*"
            multiple
            onChange={selectFiles}
            disabled={existingImages.length >= MAX_MESSAGE_IMAGES}
          />

          {existingImages.length > 0 || newFilePreviews.length > 0 ? (
            <div className="admin-image-grid">
              {existingImages.map((image) => (
                <figure key={image.path}>
                  {image.url ? <Image src={image.url} alt={image.alt} width={180} height={120} unoptimized /> : <ProtectedImage path={image.path} alt={image.alt} />}
                  <button type="button" onClick={() => removeExistingImage(image)}>削除</button>
                </figure>
              ))}
              {newFilePreviews.map(({ file, url }) => (
                <figure key={`${file.name}-${file.lastModified}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="アップロード前の画像プレビュー" />
                  <figcaption>{file.name}</figcaption>
                </figure>
              ))}
            </div>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}
          <div className="admin-form-actions">
            <button type="submit" className="pixel-button" disabled={busy}>
              {busy ? '保存中…' : messageView === 'edit' ? '更新' : '追加'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
