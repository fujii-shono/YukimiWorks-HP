import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { formatSlashDate } from '@/lib/format';
import { getNewsThumbnail, newsCategoryLabels, type News } from '@/data/news';

export function NewsCard({ article }: { article: News }) {
  const thumbnail = getNewsThumbnail(article);

  return (
    <Link href={article.href ?? `/news/${article.id}`} className="retro-card">
      <SleepWarningImage src={thumbnail} alt={`${article.title}のサムネイル`} width={560} height={315} className="retro-card-image" />
      <div className="retro-card-body">
        <p className="card-kicker">
          {formatSlashDate(article.date)} / {newsCategoryLabels[article.category]}
        </p>
        <h3>{article.title}</h3>
      </div>
    </Link>
  );
}
