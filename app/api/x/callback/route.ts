import { NextRequest, NextResponse } from 'next/server';
import { exchangeXAuthorizationCode, getXConfig, saveXConnection } from '@/lib/x/server';

export const runtime = 'nodejs';

function adminRedirect(request: NextRequest, status: 'connected' | 'error') {
  return new URL(`/admin?section=messages&x=${status}`, request.nextUrl.origin);
}

function clearOauthCookies(response: NextResponse) {
  response.cookies.set('x_oauth_state', '', { maxAge: 0, path: '/api/x' });
  response.cookies.set('x_oauth_verifier', '', { maxAge: 0, path: '/api/x' });
}

export async function GET(request: NextRequest) {
  const config = getXConfig();
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const expectedState = request.cookies.get('x_oauth_state')?.value;
  const verifier = request.cookies.get('x_oauth_verifier')?.value;

  if (!config || !code || !state || !expectedState || !verifier || state !== expectedState) {
    const response = NextResponse.redirect(adminRedirect(request, 'error'));
    clearOauthCookies(response);
    return response;
  }

  try {
    const tokens = await exchangeXAuthorizationCode(config, code, verifier);
    await saveXConnection(tokens);
    const response = NextResponse.redirect(adminRedirect(request, 'connected'));
    clearOauthCookies(response);
    return response;
  } catch {
    const response = NextResponse.redirect(adminRedirect(request, 'error'));
    clearOauthCookies(response);
    return response;
  }
}
