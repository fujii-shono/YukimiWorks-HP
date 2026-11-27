'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { BannerCropper } from '@/components/admin/BannerCropper';
import { deleteContentMedia } from '@/lib/firebase/content';
import { deleteSiteLink, saveSiteLink, subscribeToSiteLinks, uploadSiteLinkBanner } from '@/lib/firebase/links';
import type { FirebaseContentMedia, FirebaseSiteLink } from '@/lib/firebase/types';

type FormState = { label: string; url: string; order: string };
const emptyForm: FormState = { label: '', url: '', order: '0' };

export function AdminLinkManager({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<FirebaseSiteLink[]>([]);
  const [editing, setEditing] = useState<FirebaseSiteLink | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [banner, setBanner] = useState<FirebaseContentMedia | undefined>();
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeToSiteLinks(setItems, () => setError('リンク一覧を読み込めませんでした。')), []);

  const reset = () => {
    setEditing(null);
    setForm(emptyForm);
    setBanner(undefined);
    setSourceFile(null);
    setCroppedFile(null);
    setError(null);
  };

  const openNew = () => {
    reset();
    setMode('form');
  };

  const openEdit = (item: FirebaseSiteLink) => {
    setEditing(item);
    setForm({ label: item.label, url: item.url, order: String(item.order) });
    setBanner(item.banner);
    setSourceFile(null);
    setCroppedFile(null);
    setError(null);
    setMode('form');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sourceFile && !croppedFile) {
      setError('バナーの切り取り範囲を確定してください。');
      return;
    }
    setBusy(true);
    setError(null);
    let uploaded: FirebaseContentMedia | undefined;
    try {
      const id = editing?.id ?? crypto.randomUUID();
      uploaded = croppedFile ? await uploadSiteLinkBanner(id, croppedFile) : undefined;
      const resolvedBanner = uploaded ? { ...uploaded, alt: `${form.label.trim()}のバナー` } : banner;
      await saveSiteLink({ id, label: form.label, url: form.url, order: Number(form.order), banner: resolvedBanner }, !editing);
      if (uploaded && editing?.banner) await deleteContentMedia([editing.banner]);
      if (!resolvedBanner && editing?.banner) await deleteContentMedia([editing.banner]);
      setNotice('リンクを保存しました。');
      reset();
      setMode('list');
    } catch (cause) {
      if (uploaded) await deleteContentMedia([uploaded]);
      setError(cause instanceof Error ? cause.message : 'リンクを保存できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: FirebaseSiteLink) => {
    if (!window.confirm(`「${item.label}」を削除しますか？`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteSiteLink(item);
      setNotice('リンクを削除しました。');
    } catch {
      setError('リンクを削除できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'list') return (
    <div className="admin-message-manager">
      <div className="admin-subpage-header"><h2>リンク集</h2><button type="button" onClick={onBack}>管理項目へ戻る</button></div>
      <section className="admin-message-list">
        <div className="admin-list-heading"><h3>登録済みリンク</h3><button type="button" className="pixel-button" onClick={openNew}>新規追加</button></div>
        {notice ? <p className="form-success">{notice}</p> : null}{error ? <p className="form-error">{error}</p> : null}
        {!items.length ? <p>登録済みリンクはありません。</p> : null}
        {items.map((item) => (
          <article key={item.id}>
            <p>{item.label}</p><a href={item.url} target="_blank" rel="noopener noreferrer">{item.url}</a>
            <span>{item.banner ? 'バナーあり' : '通常リンク'}</span><span>表示順: {item.order}</span>
            <div><button type="button" onClick={() => openEdit(item)} disabled={busy}>編集</button><button type="button" onClick={() => void remove(item)} disabled={busy}>削除</button></div>
          </article>
        ))}
      </section>
    </div>
  );

  return (
    <div className="admin-message-manager">
      <div className="admin-subpage-header"><h2>{editing ? 'リンク編集' : '新しいリンク'}</h2><button type="button" onClick={() => { reset(); setMode('list'); }} disabled={busy}>一覧へ戻る</button></div>
      <form className="admin-message-form admin-content-form" onSubmit={submit}>
        <label htmlFor="site-link-label">リンク名</label><input id="site-link-label" value={form.label} maxLength={120} required onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} />
        <label htmlFor="site-link-url">リンク先URL</label><input id="site-link-url" value={form.url} required placeholder="https://example.com" onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} />
        <label htmlFor="site-link-order">表示順</label><input id="site-link-order" type="number" min="-9999" max="9999" step="1" value={form.order} required onChange={(event) => setForm((current) => ({ ...current, order: event.target.value }))} />
        <label htmlFor="site-link-banner">バナー画像（任意）</label><input id="site-link-banner" type="file" accept="image/*" onChange={(event) => { setSourceFile(event.target.files?.[0] ?? null); setCroppedFile(null); }} />
        {banner ? <div className="admin-media-row"><a href={banner.url} target="_blank" rel="noreferrer">登録済みバナー</a><button type="button" onClick={() => setBanner(undefined)}>削除</button></div> : null}
        {sourceFile ? <BannerCropper file={sourceFile} onCropped={(file) => { setCroppedFile(file); setError(null); }} /> : null}
        {croppedFile ? <p className="form-success">切り取り範囲を確定しました。</p> : null}
        {error ? <p className="form-error">{error}</p> : null}
        <div className="admin-form-actions"><button type="submit" className="pixel-button" disabled={busy}>{busy ? '保存中…' : '保存'}</button></div>
      </form>
    </div>
  );
}
