'use client';

import Link from 'next/link';
import { ProtectedImage } from '@/components/back-alley/ProtectedImage';
import { useBackAlleyPortfolio } from '@/components/back-alley/useBackAlleyPortfolio';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { R18Gate } from '@/components/back-alley/R18Gate';
import { TwoChoiceR18Scene } from '@/components/back-alley/TwoChoiceR18Scene';
import { PortfolioDetailMeta } from '@/components/ui/PortfolioDetailMeta';
import { formatJapaneseDateObject } from '@/lib/format';

export default function BackAlleyPortfolioDetail({ params }: { params: { id: string } }) {
  const { items, loading } = useBackAlleyPortfolio();
  const item = items.find((entry) => entry.id === params.id);
  if (loading) return <RetroPanel title="Portfolio"><p>読み込み中…</p></RetroPanel>;
  if (!item) return <RetroPanel title="Portfolio"><p>作品が見つかりません。</p><Link href="/back-alley/portfolio">一覧へ戻る</Link></RetroPanel>;
  if (item.locked) return <RetroPanel title={item.title}><article className="back-alley-portfolio-detail"><R18Gate fallback={<div className="r18-locked-cover r18-detail-locked-cover" aria-label="R18作品の画像">R18</div>}><p>作品を読み込んでいます…</p></R18Gate>{item.description ? <p>{item.description}</p> : null}<Link href="/back-alley/portfolio">一覧へ戻る</Link></article></RetroPanel>;
  if (!item.image) return <RetroPanel title="Portfolio"><p>作品を表示できません。</p></RetroPanel>;
  const media = item.interaction?.type === 'two-choice'
    ? <TwoChoiceR18Scene image={item.image} interaction={item.interaction} />
    : <ProtectedImage path={item.image.path} alt={item.image.alt} />;
  return <RetroPanel title={item.title}><article className="back-alley-portfolio-detail">{media}{item.description ? <p>{item.description}</p> : null}<PortfolioDetailMeta date={formatJapaneseDateObject(item.publishedAt.toDate())} tags={item.tags} /><Link href="/back-alley/portfolio">一覧へ戻る</Link></article></RetroPanel>;
}
