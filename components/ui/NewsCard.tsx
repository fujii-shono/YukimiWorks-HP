import Link from 'next/link';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { formatJapaneseDate } from '@/lib/format';
import { newsCategoryLabels, type News } from '@/data/news';
import { cn } from '@/lib/format';

export function NewsCard({ article }: { article: News }) {
  const hasThumbnail = article.thumbnail.trim().length > 0;

  return (
    <Link href={`/news/${article.id}`} className="retro-card">
      {hasThumbnail ? (
        <SleepWarningImage src={article.thumbnail} alt={`${article.title}のサムネイル`} width={560} height={315} className="retro-card-image" />
      ) : null}
      <div className={cn('retro-card-body', !hasThumbnail && 'retro-card-body-no-thumbnail')}>
        <p className="card-kicker">
          {formatJapaneseDate(article.date)} / {newsCategoryLabels[article.category]}
        </p>
        <h3>{article.title}</h3>
        {!hasThumbnail ? <p className="retro-card-summary">{article.summary}</p> : null}
      </div>
    </Link>
  );
}
