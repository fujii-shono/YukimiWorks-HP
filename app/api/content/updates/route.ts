import { NextResponse } from 'next/server';
import { getAllNewsItems } from '@/lib/firebase/content.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const news = await getAllNewsItems();
  const updates = news
    .map((item) => ({ id: item.id, title: item.title, date: item.date, sortDate: item.publishedAt ?? item.date, href: item.href ?? `/news/${item.id}` }))
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate))
    .slice(0, 3)
    .map(({ sortDate: _sortDate, ...item }) => item);

  return NextResponse.json({ updates }, { headers: { 'Cache-Control': 'no-store' } });
}
