import { NextResponse } from 'next/server';
import {
  deliverWeeklyOdaiToDiscord,
  deliverWeeklyOdaiToX,
  ensureCurrentWeeklyOdai,
} from '@/lib/odai/weekly.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function captureDelivery(delivery: Promise<{ status: string }>, label: string) {
  try {
    return await delivery;
  } catch (error) {
    const message = error instanceof Error ? error.message : `${label}投稿に失敗しました。`;
    console.error(`[weekly-odai:${label}] ${message}`);
    return { status: 'failed' as const };
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET が未設定です。' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const weekly = await ensureCurrentWeeklyOdai();
    const [discord, x] = await Promise.all([
      captureDelivery(deliverWeeklyOdaiToDiscord(weekly), 'discord'),
      captureDelivery(deliverWeeklyOdaiToX(weekly), 'x'),
    ]);
    const ok = discord.status !== 'failed' && x.status !== 'failed';
    return NextResponse.json(
      { ok, weekId: weekly.weekId, discord: discord.status, x: x.status },
      { status: ok ? 200 : 500 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '週次お題の更新に失敗しました。';
    console.error(`[weekly-odai] ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
