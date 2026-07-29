import { NextResponse } from 'next/server';
import { getCounterMilestoneForVisitor, getCounterValue, incrementCounterValue, isCounterConfigured } from '@/lib/counter';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const count = await getCounterValue();
    return NextResponse.json({ count, configured: isCounterConfigured() });
  } catch (error) {
    console.error('[counter] GET failed.', error);
    return NextResponse.json({ message: 'カウンターの取得に失敗しました。' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const count = await incrementCounterValue();
    const milestone = await getCounterMilestoneForVisitor(count);
    return NextResponse.json({ count, configured: isCounterConfigured(), milestone });
  } catch (error) {
    console.error('[counter] POST failed.', error);
    return NextResponse.json({ message: 'カウンターの更新に失敗しました。' }, { status: 500 });
  }
}
