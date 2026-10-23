import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getTrackingDestination, recordTrackingVisit } from '@/lib/analytics/tracking';
import { createTrackingOgpHtml, isNestedOgpResolve, isOgpCrawler, resolveTrackingOgp } from '@/lib/analytics/tracking-ogp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VISITOR_COOKIE = 'yw_x_visitor';
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

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const destination = await getTrackingDestination(token);
  if (!destination) return NextResponse.redirect(new URL('/', request.url), 307);

  const userAgent = request.headers.get('user-agent') || '';
  if (isOgpCrawler(userAgent)) {
    if (isNestedOgpResolve(request)) return redirect(destination);
    const requestUrl = new URL(request.url);
    const metadata = await resolveTrackingOgp(destination, requestUrl);
    return new NextResponse(createTrackingOgpHtml(metadata, requestUrl, destination), {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': 'text/html; charset=utf-8',
        Vary: 'User-Agent',
      },
    });
  }
  const currentVisitorId = request.headers.get('cookie')?.match(/(?:^|;\s*)yw_x_visitor=([^;]+)/)?.[1];
  const visitorId = currentVisitorId && /^[A-Za-z0-9-]{20,64}$/.test(currentVisitorId) ? currentVisitorId : randomUUID();
  try {
    await recordTrackingVisit(token, visitorId);
  } catch (error) {
    console.error('[tracking] Failed to record an anonymous visit.', error);
  }
  return redirect(destination, currentVisitorId ? undefined : visitorId);
}

export async function HEAD(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const destination = await getTrackingDestination(token);
  return NextResponse.redirect(destination || new URL('/', request.url), 307);
}
