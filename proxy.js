import { NextResponse } from 'next/server';

const COOKIE_NAME = 'cn_auth';

async function sha256Hex(input) {
  const enc = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default async function middleware(req) {
  const pin = process.env.ACCESS_PIN;
  if (!pin) {
    return new NextResponse('서버에 ACCESS_PIN 환경변수가 설정되지 않았습니다.', { status: 500 });
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const expected = await sha256Hex(pin);

  if (cookie === expected) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login|api/login).*)'],
};
