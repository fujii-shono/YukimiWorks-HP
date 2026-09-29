import { NextResponse } from 'next/server';
import { getTrackingStats, getTrackingTrafficDetail } from '@/lib/analytics/tracking';
import type { TrafficGranularity } from '@/lib/analytics/types';
import { requireFirebaseAdmin } from '@/lib/firebase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireFirebaseAdmin(request);
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const granularity = searchParams.get('granularity');
    const anchor = searchParams.get('anchor');
    if (token || granularity || anchor) {
      if (!token || (granularity !== 'daily' && granularity !== 'monthly') || !anchor) {
        return NextResponse.json({ error: '詳細表示の指定が正しくありません。' }, { status: 400 });
      }
      return NextResponse.json({ detail: await getTrackingTrafficDetail(token, granularity as TrafficGranularity, anchor) });
    }
    return NextResponse.json({ links: await getTrackingStats() });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
    if (message === 'ADMIN_REQUIRED') return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 });
    return NextResponse.json({ error: 'アクセス分析を読み込めませんでした。' }, { status: 500 });
  }
}
