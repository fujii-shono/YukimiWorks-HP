'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import {
  deleteContentMedia,
  deleteFirebaseContent,
  getContentMedia,
  MAX_CONTENT_BODY_SEGMENTS,
  MAX_CONTENT_MEDIA,
  saveFirebaseContent,
  subscribeToFirebaseContent,
  uploadContentFiles,
  validateContentFiles,
  type ContentKind,
  type FirebaseContentByKind,
} from '@/lib/firebase/content';
import type { FirebaseContentBodySegment, FirebaseContentMedia, FirebaseDiaryEntry, FirebaseNews, FirebasePortfolioItem, FirebaseWork } from '@/lib/firebase/types';
import { isSafeLinkHref } from '@/lib/format';

const labels: Record<ContentKind, string> = { portfolio: 'ポートフォリオ', works: '成果物', diary: '日記', news: 'ニュース' };
const categories = {
  works: [['contents', 'コンテンツ'], ['tools', 'ツール開発'], ['apps', 'アプリサービス']],
  diary: [['chat', '雑談'], ['report', '報告'], ['development', '開発日誌'], ['behind-the-scenes', '制作秘話'], ['content-creation-tips', 'コンテンツ制作の極意']],
  news: [['event', 'イベント'], ['announcement', 'お知らせ'], ['release', 'リリース情報'], ['other', 'その他']],
} as const;

function toTokyoInput(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function fromTokyoInput(value: string) {
  return new Date(`${value}:00+09:00`);
}

function emptyForm() {
  return { title: '', description: '', summary: '', body: '', category: '', tags: '', publishedAt: toTokyoInput(new Date()), featured: false, seoTitle: '', seoDescription: '', noIndex: false };
}

type FormState = ReturnType<typeof emptyForm>;
type AnyContent = FirebaseContentByKind[ContentKind];
type AdminBodyBlock =
  | { id: string; type: 'text'; value: string }
  | { id: string; type: 'link'; label: string; href: string }
  | { id: string; type: 'media'; media?: FirebaseContentMedia; file?: File };

function bodyBlockId() {
  return crypto.randomUUID();
}

function initialBodyBlocks(): AdminBodyBlock[] {
  return [{ id: 'initial-body-text', type: 'text', value: '' }];
}

function getBodyBlocks(record: FirebaseWork | FirebaseDiaryEntry | FirebaseNews): AdminBodyBlock[] {
  if (record.bodySegments.length) {
    return record.bodySegments.map((segment) => {
      if (segment.type === 'text') return { id: bodyBlockId(), type: 'text', value: segment.value };
      if (segment.type === 'link') return { id: bodyBlockId(), type: 'link', label: segment.label, href: segment.href };
      return { id: bodyBlockId(), type: 'media', media: segment.media };
    });
  }

  const blocks: AdminBodyBlock[] = record.body ? [{ id: bodyBlockId(), type: 'text', value: record.body }] : [];
  if ('url' in record && record.url) blocks.push({ id: bodyBlockId(), type: 'link', label: 'サービスを見る', href: record.url });
  if ('media' in record) blocks.push(...record.media.map((item) => ({ id: bodyBlockId(), type: 'media' as const, media: item })));
  return blocks.length ? blocks : initialBodyBlocks();
}

function getDiaryListExcerpt(record: FirebaseDiaryEntry, maxLength = 100) {
  const text = (record.bodySegments.length ? record.bodySegments.flatMap((segment) => segment.type === 'text' ? [segment.value] : []).join('\n\n') : record.body)
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

export function AdminContentManager({ kind, onBack }: { kind: Exclude<ContentKind, never>; onBack: () => void }) {
  const [items, setItems] = useState<AnyContent[]>([]);
  const [editing, setEditing] = useState<AnyContent | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [primary, setPrimary] = useState<FirebaseContentMedia | undefined>();
  const [bodyBlocks, setBodyBlocks] = useState<AdminBodyBlock[]>(initialBodyBlocks);
  const [newPrimary, setNewPrimary] = useState<File | null>(null);
  const [removedMedia, setRemovedMedia] = useState<FirebaseContentMedia[]>([]);
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeToFirebaseContent(kind, (records) => setItems(records as AnyContent[]), () => setError('一覧を読み込めませんでした。')), [kind]);

  const requiresPrimary = kind === 'portfolio';
  const supportsRichBody = kind === 'works' || kind === 'diary' || kind === 'news';
  const categoryOptions = kind === 'portfolio' ? [] : categories[kind as keyof typeof categories];
  const now = Date.now();

  const reset = () => {
    setEditing(null);
    setForm(emptyForm());
    setPrimary(undefined);
    setBodyBlocks(initialBodyBlocks());
    setNewPrimary(null);
    setRemovedMedia([]);
    setError(null);
  };

  const openNew = () => {
    reset();
    setMode('form');
  };

  const openEdit = (item: AnyContent) => {
    setEditing(item);
    const common = {
      title: item.title,
      publishedAt: toTokyoInput(item.publishedAt.toDate()),
      seoTitle: item.seoTitle ?? '',
      seoDescription: item.seoDescription ?? '',
      noIndex: item.noIndex,
    };
    if (kind === 'portfolio') {
      const record = item as FirebasePortfolioItem;
      setForm({ ...emptyForm(), ...common, description: record.description, tags: record.tags.join(', '), featured: record.featured });
      setPrimary(record.image);
      setBodyBlocks(initialBodyBlocks());
    } else if (kind === 'works') {
      const record = item as FirebaseWork;
      setForm({ ...emptyForm(), ...common, description: record.description, category: record.category, tags: record.tags.join(', '), featured: record.featured });
      setPrimary(record.thumbnail);
      setBodyBlocks(getBodyBlocks(record));
    } else if (kind === 'diary') {
      const record = item as FirebaseDiaryEntry;
      setForm({ ...emptyForm(), ...common, category: record.category });
      setPrimary(record.eyecatch);
      setBodyBlocks(getBodyBlocks(record));
    } else {
      const record = item as FirebaseNews;
      setForm({ ...emptyForm(), ...common, summary: record.summary, category: record.category, featured: record.featured });
      setPrimary(record.thumbnail);
      setBodyBlocks(getBodyBlocks(record));
    }
    setNewPrimary(null);
    setRemovedMedia([]);
    setError(null);
    setMode('form');
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const choosePrimary = (file: File | undefined) => {
    if (!file) return setNewPrimary(null);
    try {
      validateContentFiles([file], 0, true);
      setNewPrimary(file);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ファイルを選択できませんでした。');
    }
  };

  const chooseBodyMedia = (blockId: string, file: File | undefined) => {
    if (!file) return;
    try {
      const existingCount = bodyBlocks.filter((block) => block.type === 'media' && block.id !== blockId).length;
      validateContentFiles([file], existingCount, false);
      const currentBlock = bodyBlocks.find((block) => block.id === blockId);
      if (currentBlock?.type === 'media' && currentBlock.media) {
        setRemovedMedia((current) => current.some((item) => item.path === currentBlock.media?.path) ? current : [...current, currentBlock.media as FirebaseContentMedia]);
      }
      setBodyBlocks((current) => current.map((block) => block.id === blockId && block.type === 'media' ? { ...block, file } : block));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ファイルを選択できませんでした。');
    }
  };

  const removeExisting = (target: FirebaseContentMedia) => {
    setRemovedMedia((current) => [...current, target]);
    setPrimary(undefined);
  };

  const addBodyBlock = (type: AdminBodyBlock['type']) => {
    if (bodyBlocks.length >= MAX_CONTENT_BODY_SEGMENTS) return;
    setBodyBlocks((current) => [
      ...current,
      type === 'text'
        ? { id: bodyBlockId(), type, value: '' }
        : type === 'link'
          ? { id: bodyBlockId(), type, label: '', href: '' }
          : { id: bodyBlockId(), type },
    ]);
  };

  const updateBodyBlock = (id: string, values: Partial<AdminBodyBlock>) => {
    setBodyBlocks((current) => current.map((block) => block.id === id ? { ...block, ...values } as AdminBodyBlock : block));
  };

  const moveBodyBlock = (index: number, direction: -1 | 1) => {
    setBodyBlocks((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeBodyBlock = (index: number) => {
    const target = bodyBlocks[index];
    if (target?.type === 'media' && target.media) setRemovedMedia((removed) => [...removed, target.media as FirebaseContentMedia]);
    setBodyBlocks((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const recordId = editing?.id ?? crypto.randomUUID();
    let uploaded: FirebaseContentMedia[] = [];
    try {
      if (requiresPrimary && !primary && !newPrimary) throw new Error('作品画像を選択してください。');
      const uploadedPrimary = newPrimary ? await uploadContentFiles(kind, recordId, [newPrimary], true) : [];
      uploaded.push(...uploadedPrimary);
      const resolvedPrimary = uploadedPrimary[0] ? { ...uploadedPrimary[0], alt: `${form.title}の画像` } : primary;
      const resolvedBodySegments: FirebaseContentBodySegment[] = [];
      for (const block of bodyBlocks) {
        if (block.type === 'text') {
          if (block.value.trim()) resolvedBodySegments.push({ type: 'text', value: block.value });
        } else if (block.type === 'link') {
          if (!block.label.trim() && !block.href.trim()) continue;
          if (!block.label.trim() || !block.href.trim()) throw new Error('外部リンクは表示テキストとURLの両方を入力してください。');
          if (!isSafeLinkHref(block.href.trim())) throw new Error('リンクURLはhttp(s) URLまたはサイト内の「/」から始まるパスを入力してください。');
          resolvedBodySegments.push({ type: 'link', label: block.label.trim(), href: block.href.trim() });
        } else {
          let resolvedMedia = block.media;
          if (block.file) {
            const uploadedFiles = await uploadContentFiles(kind, recordId, [block.file]);
            uploaded.push(...uploadedFiles);
            resolvedMedia = uploadedFiles[0] ? { ...uploadedFiles[0], alt: `${form.title}の${uploadedFiles[0].type === 'video' ? '動画' : '画像'}` } : undefined;
          }
          if (!resolvedMedia) throw new Error('本文メディアのファイルを選択してください。');
          resolvedBodySegments.push({ type: 'media', media: resolvedMedia });
        }
      }
      const resolvedMedia = resolvedBodySegments.flatMap((segment) => segment.type === 'media' ? [segment.media] : []);
      const fallbackBody = resolvedBodySegments.flatMap((segment) => segment.type === 'text' ? [segment.value] : []).join('\n\n');
      const common = { title: form.title, publishedAt: fromTokyoInput(form.publishedAt), seoTitle: form.seoTitle.trim() || null, seoDescription: form.seoDescription.trim() || null, noIndex: form.noIndex };
      let value: Record<string, unknown> & { title: string; publishedAt: Date };
      if (kind === 'portfolio') value = { ...common, description: form.description.trim(), tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean), image: resolvedPrimary, featured: form.featured };
      else if (kind === 'works') value = { ...common, description: form.description.trim(), body: fallbackBody, bodySegments: resolvedBodySegments, category: form.category, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean), thumbnail: resolvedPrimary ?? null, media: resolvedMedia, url: null, featured: form.featured };
      else if (kind === 'diary') value = { ...common, body: fallbackBody, bodySegments: resolvedBodySegments, category: form.category, eyecatch: resolvedPrimary ?? null };
      else value = { ...common, summary: form.summary.trim(), body: fallbackBody, bodySegments: resolvedBodySegments, category: form.category, thumbnail: resolvedPrimary ?? null, media: resolvedMedia, featured: form.featured };
      await saveFirebaseContent(kind, recordId, value, !editing);
      const replacedPrimary = newPrimary && primary ? [primary] : [];
      await deleteContentMedia([...removedMedia, ...replacedPrimary]);
      setNotice(`${labels[kind]}を保存しました。`);
      reset();
      setMode('list');
    } catch (cause) {
      await deleteContentMedia(uploaded);
      setError(cause instanceof Error ? cause.message : '保存できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: AnyContent) => {
    if (!window.confirm(`「${item.title}」を削除しますか？`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteFirebaseContent(kind, item);
      setNotice(`${labels[kind]}を削除しました。`);
    } catch {
      setError('削除できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'list') return (
    <div className="admin-message-manager">
      <div className="admin-subpage-header"><h2>{labels[kind]}</h2><button type="button" onClick={onBack}>管理項目へ戻る</button></div>
      <section className="admin-message-list">
        <div className="admin-list-heading"><h3>登録済み{labels[kind]}</h3><button type="button" className="pixel-button" onClick={openNew}>新規追加</button></div>
        {notice ? <p className="form-success">{notice}</p> : null}{error ? <p className="form-error">{error}</p> : null}
        {!items.length ? <p>Firebaseに登録されたデータはありません。コード内の既存データはここには表示されません。</p> : null}
        {items.map((item) => {
          const portfolioImage = kind === 'portfolio' ? (item as FirebasePortfolioItem).image : null;
          const diaryExcerpt = kind === 'diary' ? getDiaryListExcerpt(item as FirebaseDiaryEntry) : '';
          return (
            <article key={item.id} className={portfolioImage ? 'admin-portfolio-list-item' : undefined}>
              {portfolioImage ? <Image src={portfolioImage.url} alt="" width={56} height={56} className="admin-portfolio-list-image" unoptimized /> : null}
              <time>{item.publishedAt.toDate().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</time>
              {item.publishedAt.toMillis() > now ? <span className="admin-message-x-status">公開予約</span> : null}
              <p>{item.title}</p>
              {diaryExcerpt ? <p className="admin-content-list-summary">{diaryExcerpt}</p> : null}
              <div><button type="button" onClick={() => openEdit(item)} disabled={busy}>編集</button><button type="button" onClick={() => void remove(item)} disabled={busy}>削除</button></div>
            </article>
          );
        })}
      </section>
    </div>
  );

  return (
    <div className="admin-message-manager">
      <div className="admin-subpage-header"><h2>{editing ? `${labels[kind]}編集` : `新しい${labels[kind]}`}</h2><button type="button" onClick={() => { reset(); setMode('list'); }} disabled={busy}>一覧へ戻る</button></div>
      <form className="admin-message-form admin-content-form" onSubmit={submit}>
        <label htmlFor="content-title">タイトル</label><input id="content-title" value={form.title} maxLength={120} required onChange={(event) => update('title', event.target.value)} />
        {kind === 'portfolio' || kind === 'works' ? <><label htmlFor="content-description">説明</label><textarea id="content-description" value={form.description} rows={4} required onChange={(event) => update('description', event.target.value)} /></> : null}
        {kind === 'news' ? <><label htmlFor="content-summary">要約</label><textarea id="content-summary" value={form.summary} rows={3} required onChange={(event) => update('summary', event.target.value)} /></> : null}
        {supportsRichBody ? (
          <fieldset className="admin-body-editor">
            <legend>本文（文章・外部リンク・メディア）</legend>
            {bodyBlocks.map((block, index) => (
              <section className="admin-body-block" key={block.id}>
                <div className="admin-body-block-heading">
                  <strong>ブロック {index + 1}</strong>
                  <div>
                    <button type="button" onClick={() => moveBodyBlock(index, -1)} disabled={index === 0}>↑</button>
                    <button type="button" onClick={() => moveBodyBlock(index, 1)} disabled={index === bodyBlocks.length - 1}>↓</button>
                    <button type="button" onClick={() => removeBodyBlock(index)}>削除</button>
                  </div>
                </div>
                {block.type === 'text' ? (
                  <><label htmlFor={`content-body-text-${block.id}`}>文章</label><textarea id={`content-body-text-${block.id}`} rows={7} value={block.value} onChange={(event) => updateBodyBlock(block.id, { value: event.target.value })} placeholder="本文中にURLを直接書くと、リンク化されOGPがある場合はカードも表示されます。" /></>
                ) : null}
                {block.type === 'link' ? (
                  <div className="admin-body-link-fields">
                    <label htmlFor={`content-body-link-label-${block.id}`}>表示テキスト</label><input id={`content-body-link-label-${block.id}`} value={block.label} onChange={(event) => updateBodyBlock(block.id, { label: event.target.value })} />
                    <label htmlFor={`content-body-link-url-${block.id}`}>リンクURL</label><input id={`content-body-link-url-${block.id}`} value={block.href} required={Boolean(block.label || block.href)} onChange={(event) => updateBodyBlock(block.id, { href: event.target.value })} placeholder="https://example.com または /works/..." />
                  </div>
                ) : null}
                {block.type === 'media' ? (
                  <div className="admin-body-media-field">
                    {block.media ? <a href={block.media.url} target="_blank" rel="noreferrer">登録済み{block.media.type === 'video' ? '動画' : '画像'}</a> : null}
                    <label htmlFor={`content-body-media-${block.id}`}>{block.media ? '差し替える' : '画像・動画を選択'}</label>
                    <input id={`content-body-media-${block.id}`} type="file" accept="image/*,video/*" required={!block.media && !block.file} onChange={(event) => chooseBodyMedia(block.id, event.target.files?.[0])} />
                    {block.file ? <span>{block.file.name}</span> : null}
                  </div>
                ) : null}
              </section>
            ))}
            <div className="admin-body-add-actions">
              <button type="button" onClick={() => addBodyBlock('text')} disabled={bodyBlocks.length >= MAX_CONTENT_BODY_SEGMENTS}>文章を追加</button>
              <button type="button" onClick={() => addBodyBlock('link')} disabled={bodyBlocks.length >= MAX_CONTENT_BODY_SEGMENTS}>外部リンクを追加</button>
              <button type="button" onClick={() => addBodyBlock('media')} disabled={bodyBlocks.length >= MAX_CONTENT_BODY_SEGMENTS || bodyBlocks.filter((block) => block.type === 'media').length >= MAX_CONTENT_MEDIA}>メディアを追加</button>
            </div>
          </fieldset>
        ) : null}
        {categoryOptions.length ? <><label htmlFor="content-category">カテゴリ</label><select id="content-category" value={form.category} required onChange={(event) => update('category', event.target.value)}><option value="">選択してください</option>{categoryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></> : null}
        {kind === 'portfolio' || kind === 'works' ? <><label htmlFor="content-tags">タグ（カンマ区切り）</label><input id="content-tags" value={form.tags} onChange={(event) => update('tags', event.target.value)} /></> : null}
        <label htmlFor="content-published-at">公開日時（日本時間）</label><input id="content-published-at" type="datetime-local" value={form.publishedAt} required onChange={(event) => update('publishedAt', event.target.value)} />
        <label htmlFor="content-primary">{kind === 'portfolio' ? '作品画像' : kind === 'diary' ? 'アイキャッチ（任意）' : 'サムネイル（任意）'}</label><input id="content-primary" type="file" accept="image/*" required={requiresPrimary && !primary} onChange={(event) => choosePrimary(event.target.files?.[0])} />
        {primary ? <div className="admin-media-row"><a href={primary.url} target="_blank" rel="noreferrer">登録済み画像</a><button type="button" onClick={() => removeExisting(primary)}>削除</button></div> : null}
        {newPrimary ? <p>{newPrimary.name}</p> : null}
        {kind !== 'diary' ? <label className="admin-x-post-toggle"><input type="checkbox" checked={form.featured} onChange={(event) => update('featured', event.target.checked)} />注目表示</label> : null}
        <details><summary>SEO設定（任意）</summary><div className="admin-content-seo"><label htmlFor="content-seo-title">SEOタイトル</label><input id="content-seo-title" value={form.seoTitle} onChange={(event) => update('seoTitle', event.target.value)} /><label htmlFor="content-seo-description">SEO説明</label><textarea id="content-seo-description" rows={3} value={form.seoDescription} onChange={(event) => update('seoDescription', event.target.value)} /><label className="admin-x-post-toggle"><input type="checkbox" checked={form.noIndex} onChange={(event) => update('noIndex', event.target.checked)} />検索結果に掲載しない</label></div></details>
        {error ? <p className="form-error">{error}</p> : null}<div className="admin-form-actions"><button type="submit" className="pixel-button" disabled={busy}>{busy ? '保存中…' : '保存'}</button></div>
      </form>
    </div>
  );
}
