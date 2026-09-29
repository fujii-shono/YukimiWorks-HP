import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getTrackingDestination, recordTrackingVisit } from '@/lib/analytics/tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VISITOR_COOKIE = 'yw_x_visitor';
const BOT_PATTERN = /bot|crawler|spider|preview|twitterbot|facebookexternalhit|slackbot|discordbot|whatsapp|telegrambot|embedly|quora link preview/i;

function redirect(destination: string, visitorId?: string) {
  const response = NextResponse.redirect(destination, 307);
  response.headers.set('Cache-Control', 'private, no-store');
  if (visitorId) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }
  return response;
}

export async function GET(request: Request, { params }: { params: { token: string } }) {
  const destination = await getTrackingDestination(params.token);
  if (!destination) return NextResponse.redirect(new URL('/', request.url), 307);

  const userAgent = request.headers.get('user-agent') || '';
  if (BOT_PATTERN.test(userAgent)) return redirect(destination);
  const currentVisitorId = request.headers.get('cookie')?.match(/(?:^|;\s*)yw_x_visitor=([^;]+)/)?.[1];
  const visitorId = currentVisitorId && /^[A-Za-z0-9-]{20,64}$/.test(currentVisitorId) ? currentVisitorId : randomUUID();
  try {
    await recordTrackingVisit(params.token, visitorId);
  } catch (error) {
    console.error('[tracking] Failed to record an anonymous visit.', error);
  }
  return redirect(destination, currentVisitorId ? undefined : visitorId);
}

export async function HEAD(request: Request, context: { params: { token: string } }) {
  const destination = await getTrackingDestination(context.params.token);
  return NextResponse.redirect(destination || new URL('/', request.url), 307);
}
