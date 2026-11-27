import { RetroPanel } from '@/components/panels/RetroPanel';
import { CircleLatestList, type CircleLatestItem } from '@/components/sections/CircleLatestList';
import { getNewsThumbnail } from '@/data/news';
import { getAllGoods, getAllNewsItems, getAllWorks } from '@/lib/firebase/content.server';

const placeholderImage = '/works/placeholder.svg';

export async function CircleLatestSections() {
  const [newsItems, works, goods] = await Promise.all([getAllNewsItems(), getAllWorks(), getAllGoods()]);
  const latestNews: CircleLatestItem[] = newsItems.map((item) => ({
    id: item.id,
    href: item.href ?? `/news/${item.id}`,
    title: item.title,
    image: { src: getNewsThumbnail(item), alt: `${item.title}のサムネイル` },
  }));
  const latestWorks: CircleLatestItem[] = works.map((item) => ({
    id: item.id,
    href: `/works/${item.id}`,
    title: item.title,
    image: { src: item.thumbnail || placeholderImage, alt: `${item.title}のサムネイル` },
  }));
  const latestGoods: CircleLatestItem[] = goods.map((item) => ({
    id: item.id,
    href: `/goods/${item.id}`,
    title: item.title,
    image: { src: item.thumbnail || placeholderImage, alt: `${item.title}のサムネイル` },
  }));

  return (
    <div className="circle-latest-sections">
      <RetroPanel title="ニュース" titleIconSrc="/icons/default/apps.png" titleHref="/news" contentClassName="circle-latest-panel-body">
        {latestNews.length ? <CircleLatestList items={latestNews} /> : <p className="circle-latest-empty">ニュースはまだありません</p>}
      </RetroPanel>

      <RetroPanel title="作品" titleIconSrc="/icons/default/contents.png" titleHref="/works" contentClassName="circle-latest-panel-body">
        {latestWorks.length ? <CircleLatestList items={latestWorks} /> : <p className="circle-latest-empty">作品はまだありません</p>}
      </RetroPanel>

      <RetroPanel title="グッズ" titleIconSrc="/icons/user/coin.png" titleHref="/goods" contentClassName="circle-latest-panel-body">
        {latestGoods.length ? <CircleLatestList items={latestGoods} /> : <p className="circle-latest-empty">グッズ情報はまだありません</p>}
      </RetroPanel>
    </div>
  );
}
