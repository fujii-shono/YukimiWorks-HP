import Link from 'next/link';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { workCategoryLabels, type Work } from '@/data/works';

export function WorkCard({ work }: { work: Work }) {
  return (
    <Link href={`/works/${work.id}`} className="retro-card">
      <SleepWarningImage src={work.thumbnail} alt={`${work.title}のサムネイル`} width={560} height={420} className="retro-card-image" />
      <div className="retro-card-body">
        <p className="card-kicker">{workCategoryLabels[work.category]}</p>
        <h3>{work.title}</h3>
        <p>{work.description}</p>
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
