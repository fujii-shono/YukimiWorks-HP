'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';
import { AdminTrafficAnalytics } from '@/components/admin/AdminTrafficAnalytics';
import { AdminContentManager } from '@/components/admin/AdminContentManager';
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
import { disconnectX, getXStatus, postSavedMessageToX, startXConnection } from '@/lib/x/client';
import { getXPostCharacterCount, isXPostTooLong, MAX_X_POST_CHARACTERS } from '@/lib/x/characters';

const adminSections = [
  { id: 'messages', label: 'メッセージ' },
  { id: 'portfolio', label: 'ポートフォリオ' },
  { id: 'works', label: '成果物' },
  { id: 'diary', label: '日記' },
  { id: 'news', label: 'ニュース' },
  { id: 'analytics', label: 'アクセス分析' },
] as const;

type AdminSection = (typeof adminSections)[number]['id'];
type MessageView = 'list' | 'new' | 'edit';
type XConnectionStatus = { configured: boolean; connected: boolean; username?: string; dryRun?: boolean };

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

function getXPostStatusLabel(message: FirebaseMessage) {
  if (!message.postToX) return null;
  if (message.xPostStatus === 'posted') return 'X投稿済み';
  if (message.xPostStatus === 'skipped_too_long') return '長文のため投稿しませんでした';
  if (message.xPostStatus === 'failed') return 'X投稿失敗';
  return 'X投稿待ち';
}

export function AdminMessageManager({ basePath = '/admin' }: { basePath?: '/admin' | '/back-alley/admin' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firebaseUser, profile, loading, profileLoading } = useFirebaseAuth();
  const [messages, setMessages] = useState<FirebaseMessage[]>([]);
  const [body, setBody] = useState('');
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [existingImages, setExistingImages] = useState<FirebaseMessageImage[]>([]);
  const [removedImages, setRemovedImages] = useState<FirebaseMessageImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [postToX, setPostToX] = useState(false);
  const [audience, setAudience] = useState<'front' | 'back-alley' | 'r18'>('front');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [xConnection, setXConnection] = useState<XConnectionStatus | null>(null);
  const [xConnectionBusy, setXConnectionBusy] = useState(false);
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
  const xPostCharacterCount = useMemo(() => getXPostCharacterCount(body.trim()), [body]);
  const xPostTooLong = postToX && isXPostTooLong(body.trim());
  const editingMessage = editingId ? messages.find((message) => message.id === editingId) : undefined;

  useEffect(() => () => newFilePreviews.forEach(({ url }) => URL.revokeObjectURL(url)), [newFilePreviews]);

  useEffect(() => {
    if (!isAdmin || activeSection !== 'messages') return;
    return subscribeToFirebaseMessages(setMessages, () => setError('メッセージ一覧を読み込めませんでした。'), true, true);
  }, [activeSection, isAdmin]);

  useEffect(() => {
    if (!firebaseUser || !isAdmin || activeSection !== 'messages') return;
    let active = true;
    void getXStatus(firebaseUser)
      .then((status) => {
        if (active) setXConnection(status);
      })
      .catch((statusError) => {
        if (active) setError(statusError instanceof Error ? statusError.message : 'X接続状態を確認できませんでした。');
      });
    return () => {
      active = false;
    };
  }, [activeSection, firebaseUser, isAdmin, searchParams]);

  useEffect(() => {
    const xResult = searchParams.get('x');
    if (xResult === 'connected') setNotice('Xアカウントを接続しました。');
    if (xResult === 'error') setError('Xアカウントを接続できませんでした。設定を確認して再度お試しください。');
  }, [searchParams]);

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
      setPostToX(message.postToX);
      setAudience(message.audience);
      setError(null);
    } else {
      setBody('');
      setPublishedAt(initialPublishedAt());
      setExistingImages([]);
      setRemovedImages([]);
      setNewFiles([]);
      setPostToX(false);
      setAudience('front');
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
    setPostToX(false);
    setAudience('front');
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
      if (postToX && !xPostTooLong && !xConnection?.connected) {
        throw new Error('先にXアカウントを接続してください。');
      }
      const savedMessage = await saveFirebaseMessage({
        id: editingId || undefined,
        body,
        authorName: profile?.displayName ?? '管理者',
        publishedAt: new Date(`${publishedAt}:00+09:00`),
        existingImages,
        newFiles,
        postToX,
        audience,
        previousAudience: editingMessage?.audience,
        skipXPostForLength: xPostTooLong,
        retrySkippedXPost: Boolean(!xPostTooLong && editingMessage?.xPostStatus === 'skipped_too_long'),
      });
      if (removedImages.length > 0) await deleteMessageImages(removedImages);
      let nextNotice = editingId ? 'メッセージを更新しました。' : 'メッセージを追加しました。';
      let xPostError: string | null = null;
      if (xPostTooLong) {
        nextNotice += ' 長文のためXには投稿しませんでした。';
      } else if (postToX && firebaseUser) {
        try {
          const result = await postSavedMessageToX(firebaseUser, savedMessage.id);
          nextNotice += result.alreadyPosted ? ' Xには投稿済みです。' : result.dryRun ? ' テスト設定によりX投稿済みとして記録しました。' : ' Xにも投稿しました。';
        } catch (postError) {
          xPostError = postError instanceof Error ? postError.message : 'Xへの投稿に失敗しました。';
        }
      }
      resetForm();
      setNotice(nextNotice);
      if (xPostError) setError(`メッセージは保存しましたが、Xへ投稿できませんでした：${xPostError}`);
      router.push(`${basePath}?section=messages`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'メッセージを保存できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  const connectXAccount = async () => {
    if (!firebaseUser) return;
    setXConnectionBusy(true);
    setError(null);
    try {
      await startXConnection(firebaseUser);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : 'X接続を開始できませんでした。');
      setXConnectionBusy(false);
    }
  };

  const disconnectXAccount = async () => {
    if (!firebaseUser || !window.confirm('Xアカウントの接続を解除しますか？')) return;
    setXConnectionBusy(true);
    setError(null);
    try {
      await disconnectX(firebaseUser);
      setXConnection({ configured: true, connected: false });
      setNotice('Xアカウントの接続を解除しました。');
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : 'Xアカウントの接続を解除できませんでした。');
    } finally {
      setXConnectionBusy(false);
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

  if (activeSection !== 'messages') {
    return <AdminContentManager kind={activeSection as 'portfolio' | 'works' | 'diary' | 'news'} onBack={backToDashboard} />;
  }

  return (
    <div className="admin-message-manager">
      <div className="admin-subpage-header">
        <h2>メッセージ</h2>
        <button type="button" onClick={backToDashboard} disabled={busy}>管理項目へ戻る</button>
      </div>

      <section className="admin-x-connection" aria-label="Xアカウント接続">
        <div>
          <h3>X連携</h3>
          {!xConnection ? <p>接続状態を確認しています…</p> : null}
          {xConnection && !xConnection.configured ? <p>X APIの環境変数が未設定です。</p> : null}
          {xConnection?.dryRun ? <p><strong>ドライラン中</strong> — X APIを呼ばず投稿済みとして記録します。</p> : null}
          {xConnection?.configured && xConnection.connected && !xConnection.dryRun ? (
            <p><strong>@{xConnection.username}</strong> に、チェックしたメッセージを保存時に投稿します。</p>
          ) : null}
          {xConnection?.configured && !xConnection.connected ? <p>Xアカウントは未接続です。</p> : null}
        </div>
        {xConnection?.configured && xConnection.connected && !xConnection.dryRun ? (
          <button type="button" onClick={() => void disconnectXAccount()} disabled={busy || xConnectionBusy}>接続解除</button>
        ) : null}
        {xConnection?.configured && !xConnection.connected ? (
          <button type="button" className="pixel-button" onClick={() => void connectXAccount()} disabled={busy || xConnectionBusy}>
            {xConnectionBusy ? '接続中…' : 'Xアカウントを接続'}
          </button>
        ) : null}
      </section>

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
              {getXPostStatusLabel(message) ? <span className="admin-message-x-status">{getXPostStatusLabel(message)}</span> : null}
              <time dateTime={message.publishedAt.toDate().toISOString()}>
                {message.publishedAt.toDate().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
              </time>
              <p>{message.body}</p>
              <span>{message.audience === 'r18' ? '裏ページ R18用' : message.audience === 'back-alley' ? '裏ページ用' : '表用'}</span>
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

          <label className="admin-x-post-toggle" htmlFor="admin-message-back-alley">
            <input id="admin-message-back-alley" type="checkbox" checked={audience !== 'front'} onChange={(event) => setAudience(event.target.checked ? 'back-alley' : 'front')} />
            裏ページ用のメッセージにする
          </label>
          <label className="admin-x-post-toggle" htmlFor="admin-message-r18">
              <input id="admin-message-r18" type="checkbox" checked={audience === 'r18'} onChange={(event) => setAudience(event.target.checked ? 'r18' : 'back-alley')} />
              R18メッセージにする
          </label>

          <label className="admin-x-post-toggle" htmlFor="admin-message-post-to-x">
            <input
              id="admin-message-post-to-x"
              type="checkbox"
              checked={postToX}
              onChange={(event) => setPostToX(event.target.checked)}
            />
            Xにも投稿する（保存時に即時投稿）
          </label>
          {postToX ? (
            <p className={xPostTooLong ? 'form-error admin-x-length-note' : 'admin-x-length-note'}>
              X投稿換算: {xPostCharacterCount} / {MAX_X_POST_CHARACTERS}文字（URLは1件23文字として換算）
              {xPostTooLong ? '。上限を超えるため、保存してもXには投稿しません。' : ''}
            </p>
          ) : null}

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
