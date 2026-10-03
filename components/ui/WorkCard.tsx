import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { workCategoryLabels, type Work } from '@/data/works';

export function WorkCard({ work }: { work: Work }) {
  const hasThumbnail = work.thumbnail.trim().length > 0;

  return (
    <Link href={`/works/${work.id}`} className="retro-card">
      {hasThumbnail ? (
        <SleepWarningImage src={work.thumbnail} alt={`${work.title}のサムネイル`} width={560} height={315} className="retro-card-image" />
      ) : null}
      <div className="retro-card-body">
        <p className="card-kicker">{workCategoryLabels[work.category]}</p>
        <h3>{work.title}</h3>
        <div className="tag-list">
          {work.tags.map((tag) => (
            <span key={tag} className="tag-badge">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
