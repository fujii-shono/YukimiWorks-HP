import { NextResponse } from 'next/server';
import { getBokinSupportMessages } from '@/lib/bokinMessages';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const bokinMessages = await getBokinSupportMessages();
    return NextResponse.json({ bokinMessages });
  } catch (error) {
    console.error('[messages] GET failed.', error);
    return NextResponse.json({ bokinMessages: [] });
  }
}
