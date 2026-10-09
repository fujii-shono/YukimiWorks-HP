'use client';

import { useEffect, useState } from 'react';
import { loadProtectedBlobUrl } from '@/lib/firebase/backAlley';

function developmentAssetUrl(path: string) {
  const prefix = 'protected/back-alley/r18/portfolio/bunny/';
  if (process.env.NODE_ENV === 'production' || !path.startsWith(prefix)) return null;
  const fileName = path.slice(prefix.length);
  return ['1.png', 'a.png', 'b.png'].includes(fileName) ? `/api/local-r18-assets/bunny/${fileName}` : null;
}

export function useProtectedImageSource(path: string) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setSrc(null);
    setFailed(false);
    const localUrl = developmentAssetUrl(path);
    if (localUrl) {
      setSrc(localUrl);
      return () => { active = false; };
    }
    void loadProtectedBlobUrl(path).then((url) => {
      objectUrl = url;
      if (active) setSrc(url); else URL.revokeObjectURL(url);
    }).catch(() => active && setFailed(true));
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path]);
  return { src, failed };
}

export function ProtectedImage({ path, alt, className }: { path: string; alt: string; className?: string }) {
  const { src, failed } = useProtectedImageSource(path);
  if (failed) return <span className="protected-image-status">画像を表示できません</span>;
  if (!src) return <span className="protected-image-status">画像を読み込み中…</span>;
  // Blob URLは認可済みのStorage取得後にだけ生成する。
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} />;
}
