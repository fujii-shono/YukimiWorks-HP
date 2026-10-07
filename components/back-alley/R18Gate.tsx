'use client';

import { useState } from 'react';
import { useFirebaseAuth } from '@/components/auth/FirebaseAuthProvider';

export function R18Gate({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const { profile, updateAdultConfirmation } = useFirebaseAuth();
  const [saving, setSaving] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (profile?.adultConfirmed) return <>{children}</>;
  return <>{fallback}{!declined ? <div className="modal-overlay" onMouseDown={() => setDeclined(true)}><section className="modal-panel modal-panel-small" role="dialog" aria-modal="true" aria-labelledby="r18-title" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="modal-close" aria-label="閉じる" onClick={() => setDeclined(true)}>×</button><h2 id="r18-title">18歳以上ですか？</h2><p>この作品はR18です。18歳未満の方は閲覧できません。</p>{error ? <p className="form-error">{error}</p> : null}<div className="back-alley-gate-actions"><button className="pixel-button" type="button" disabled={saving} onClick={() => { setSaving(true); setError(null); void updateAdultConfirmation(true).catch(() => setError('成人確認を保存できませんでした。')).finally(() => setSaving(false)); }}>{saving ? '保存中…' : '18歳以上です'}</button><button type="button" disabled={saving} onClick={() => setDeclined(true)}>いいえ</button></div></section></div> : null}</>;
}
