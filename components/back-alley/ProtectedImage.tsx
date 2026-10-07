'use client';

import { useEffect, useState } from 'react';
import { loadProtectedBlobUrl } from '@/lib/firebase/backAlley';

export function ProtectedImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    void loadProtectedBlobUrl(path).then((url) => {
      objectUrl = url;
      if (active) setSrc(url); else URL.revokeObjectURL(url);
    }).catch(() => active && setFailed(true));
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path]);
  if (failed) return <span className="protected-image-status">画像を表示できません</span>;
  if (!src) return <span className="protected-image-status">画像を読み込み中…</span>;
  // Blob URLは認可済みのStorage取得後にだけ生成する。
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}
