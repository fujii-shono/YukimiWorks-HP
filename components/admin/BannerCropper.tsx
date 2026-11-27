'use client';

import { useEffect, useRef, useState } from 'react';
import { cropImageToBanner } from '@/lib/image/crop';

type Position = { x: number; y: number };

export function BannerCropper({ file, onCropped }: { file: File; onCropped: (file: File) => void }) {
  const [source, setSource] = useState('');
  const [position, setPosition] = useState<Position>({ x: 50, y: 50 });
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pointer = useRef<{ id: number; x: number; y: number; position: Position } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSource(url);
    setPosition({ x: 50, y: 50 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointer.current;
    if (!start || event.pointerId !== start.id) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextX = Math.min(100, Math.max(0, start.position.x - ((event.clientX - start.x) / bounds.width) * 100));
    const nextY = Math.min(100, Math.max(0, start.position.y - ((event.clientY - start.y) / bounds.height) * 100));
    setPosition({ x: nextX, y: nextY });
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      onCropped(await cropImageToBanner(file, position.x, position.y));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'バナーを切り取れませんでした。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="banner-cropper" aria-label="バナーの切り取り範囲">
      <p>画像をドラッグして、横長バナーに使う範囲を調整してください。</p>
      <div
        className={dragging ? 'banner-cropper-stage is-dragging' : 'banner-cropper-stage'}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, position };
          setDragging(true);
        }}
        onPointerMove={move}
        onPointerUp={(event) => {
          if (pointer.current?.id === event.pointerId) pointer.current = null;
          setDragging(false);
        }}
        onPointerCancel={() => {
          pointer.current = null;
          setDragging(false);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {source ? <img src={source} alt="バナー切り取りプレビュー" draggable={false} style={{ objectPosition: `${position.x}% ${position.y}%` }} /> : null}
      </div>
      <div className="banner-cropper-controls">
        <label>横位置<input type="range" min="0" max="100" value={position.x} onChange={(event) => setPosition((current) => ({ ...current, x: Number(event.target.value) }))} /></label>
        <label>縦位置<input type="range" min="0" max="100" value={position.y} onChange={(event) => setPosition((current) => ({ ...current, y: Number(event.target.value) }))} /></label>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <button type="button" onClick={() => void confirm()} disabled={busy}>{busy ? '切り取り中…' : 'この範囲で切り取る'}</button>
    </section>
  );
}
