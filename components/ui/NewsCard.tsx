import Link from 'next/link';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { formatJapaneseDate } from '@/lib/format';
import { newsCategoryLabels, type News } from '@/data/news';

export function NewsCard({ article }: { article: News }) {
  return (
    <Link href={`/news/${article.id}`} className="retro-card">
      <SleepWarningImage src={article.thumbnail} alt={`${article.title}のサムネイル`} width={560} height={315} className="retro-card-image" />
      <div className="retro-card-body">
        <p className="card-kicker">
          {formatJapaneseDate(article.date)} / {newsCategoryLabels[article.category]}
        </p>
        <h3>{article.title}</h3>
        <p>{article.summary}</p>
      </div>
    </Link>
  );
}
