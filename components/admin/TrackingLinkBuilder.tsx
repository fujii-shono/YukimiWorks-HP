'use client';

import { useState, type KeyboardEvent } from 'react';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';
import { generateTrackingLink } from '@/lib/analytics/client';

export function TrackingLinkBuilder({ onInsert, disabled = false }: { onInsert: (url: string) => string | null; disabled?: boolean }) {
  const { firebaseUser } = useFirebaseAuth();
  const [destinationUrl, setDestinationUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!firebaseUser) {
      setError('管理者としてログインしてください。');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const link = await generateTrackingLink(firebaseUser, destinationUrl);
      const insertError = onInsert(link.trackingUrl);
      if (insertError) {
        setError(insertError);
        return;
      }
      setDestinationUrl('');
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : '識別付きリンクを生成できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="tracking-link-builder" aria-labelledby="tracking-link-builder-title">
      <h4 id="tracking-link-builder-title">アクセス計測リンク</h4>
      <p>このサイト内のURLを、X経由の訪問人数を計測できるリンクへ変換して本文に挿入します。</p>
      <div className="tracking-link-controls">
        <label htmlFor="tracking-link-destination">リンク先URL</label>
        <div>
          <input
            id="tracking-link-destination"
            type="url"
            value={destinationUrl}
            placeholder="https://yukimiworks.com/works/..."
            disabled={disabled || busy}
            onChange={(event) => setDestinationUrl(event.target.value)}
            onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void generate();
              }
            }}
          />
          <button type="button" disabled={disabled || busy || !destinationUrl.trim()} onClick={() => void generate()}>
            {busy ? '生成中…' : '生成して本文へ挿入'}
          </button>
        </div>
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </section>
  );
}
