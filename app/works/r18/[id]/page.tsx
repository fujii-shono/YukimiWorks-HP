'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BackAlleyPortfolioImage } from '@/components/back-alley/BackAlleyPortfolioImage';
import { TwoChoiceR18Scene } from '@/components/back-alley/TwoChoiceR18Scene';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { PortfolioDetailMeta } from '@/components/ui/PortfolioDetailMeta';
import { useR18Works } from '@/components/works/useR18Works';
import { formatJapaneseDateObject } from '@/lib/format';

export default function R18WorkDetailPage() {
  const params = useParams<{ id: string }>();
  const { items, loading, error, enabled } = useR18Works();
  const item = items.find((entry) => entry.id === params.id);

  return (
    <SiteFrame>
      {loading ? (
        <RetroPanel title="R18作品"><p>読み込み中…</p></RetroPanel>
      ) : !enabled ? (
        <RetroPanel title="R18作品">
          <p>この作品を表示するには、ログイン後にアカウント設定で「R18作品を表示する」を有効にしてください。</p>
          <Link href="/works">作品一覧へ戻る</Link>
        </RetroPanel>
      ) : error ? (
        <RetroPanel title="R18作品"><p className="form-error">{error}</p><Link href="/works">作品一覧へ戻る</Link></RetroPanel>
      ) : !item ? (
        <RetroPanel title="R18作品"><p>作品が見つかりません。</p><Link href="/works">作品一覧へ戻る</Link></RetroPanel>
      ) : !item.image ? (
        <RetroPanel title={item.title}><p>作品を表示できません。</p></RetroPanel>
      ) : (
        <RetroPanel title={item.title}>
          <article className="back-alley-portfolio-detail">
            {item.interaction?.type === 'two-choice' ? (
              <TwoChoiceR18Scene image={item.image} interaction={item.interaction} />
            ) : (
              <BackAlleyPortfolioImage path={item.image.path} alt={item.image.alt} title={item.title} />
            )}
            {item.description ? <p>{item.description}</p> : null}
            <PortfolioDetailMeta date={formatJapaneseDateObject(item.publishedAt.toDate())} tags={item.tags} />
            <Link href="/works">作品一覧へ戻る</Link>
          </article>
        </RetroPanel>
      )}
    </SiteFrame>
  );
}
