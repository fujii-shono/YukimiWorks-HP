import { NextResponse } from 'next/server';
import { getDiaryDate, getDiaryId, getDiaryPublishedTime } from '@/data/diary';
import { getAllDiaryEntries, getAllNewsItems } from '@/lib/firebase/content.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [news, diary] = await Promise.all([getAllNewsItems(), getAllDiaryEntries()]);
  const updates = [
    ...news.map((item) => ({ id: item.id, title: item.title, date: item.date, sortDate: item.publishedAt ?? item.date, href: item.href ?? `/news/${item.id}` })),
    ...diary.map((entry) => ({ id: `diary-${getDiaryId(entry)}`, title: `日記「${entry.title}」を追加しました`, date: getDiaryDate(entry), sortDate: getDiaryPublishedTime(entry), href: `/diary/${getDiaryId(entry)}` })),
  ].sort((a, b) => b.sortDate.localeCompare(a.sortDate)).slice(0, 3).map(({ sortDate: _sortDate, ...item }) => item);

  return NextResponse.json({ updates }, { headers: { 'Cache-Control': 'no-store' } });
}
