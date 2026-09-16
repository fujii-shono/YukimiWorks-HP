import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import {
  defaultDiaryEyecatch,
  diaryCategoryLabels,
  diaryEntries,
  getDiaryDate,
  getDiaryId,
  getDiaryTime,
  isDiaryPublished,
  type DiaryCategory,
} from '@/data/diary';
import { formatJapaneseDate } from '@/lib/format';

const allCategories: DiaryCategory[] = ['chat', 'report', 'development', 'behind-the-scenes', 'content-creation-tips'];
export const dynamic = 'force-dynamic';

export default function DiaryPage({ searchParams }: { searchParams?: { category?: string } }) {
  const validCategory = allCategories.includes(searchParams?.category as DiaryCategory)
    ? (searchParams?.category as DiaryCategory)
    : null;
  const publishedEntries = diaryEntries.filter((entry) => isDiaryPublished(entry));
  const filteredEntries = validCategory ? publishedEntries.filter((entry) => entry.category === validCategory) : publishedEntries;

  return (
    <SiteFrame>
      <RetroPanel title="日記" titleAside="Diary" contentClassName="listing-panel-body">
        <div className="filter-tabs">
          <Link href="/diary" className={!validCategory ? 'active' : undefined}>
            すべて
          </Link>
          {allCategories.map((category) => (
            <Link key={category} href={`/diary?category=${category}`} className={validCategory === category ? 'active' : undefined}>
              {diaryCategoryLabels[category]}
            </Link>
          ))}
        </div>
        {filteredEntries.length ? (
          <div className="card-grid">
            {filteredEntries.map((entry) => {
              const id = getDiaryId(entry);
              const eyecatch = entry.eyecatch?.trim() || defaultDiaryEyecatch;

              return (
                <Link key={id} href={`/diary/${id}`} className="retro-card">
                  <SleepWarningImage
                    src={eyecatch}
                    alt={entry.eyecatchAlt ?? `${entry.title}のアイキャッチ`}
                    width={560}
                    height={315}
                    className="retro-card-image"
                  />
                  <div className="retro-card-body">
                    <p className="card-kicker">
                      {formatJapaneseDate(getDiaryDate(entry))} {getDiaryTime(entry)}
                    </p>
                    <h3>{entry.title}</h3>
                    <div className="tag-list">
                      <span className="tag-badge">{diaryCategoryLabels[entry.category]}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">このカテゴリの日記はまだありません</p>
        )}
      </RetroPanel>
    </SiteFrame>
  );
}
