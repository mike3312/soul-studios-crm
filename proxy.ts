import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  sessionForToken,
  trustedOrigin,
  authError,
} from '@/lib/auth';

const publicPaths = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/favicon.ico',
  '/favicon.svg',
  '/og.png',
  '/robots.txt',
]);

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.startsWith('/_next/static/') || path === '/_next/image')
    return NextResponse.next();
  if (path === '/api/webhooks/whatsapp') return NextResponse.next();
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    !trustedOrigin(request.headers.get('origin'))
  ) {
    return authError('Origen de solicitud no permitido.', 403);
  }
  if (publicPaths.has(path)) return NextResponse.next();
  try {
    if (await sessionForToken(request.cookies.get(SESSION_COOKIE)?.value)) {
      const response = NextResponse.next();
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
    if (path.startsWith('/api/'))
      return authError('Tu sesión terminó. Inicia sesión de nuevo.', 401);
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch {
    return authError(
      'El acceso no está disponible temporalmente. Intenta de nuevo.',
      503,
    );
  }
}

export const config = { matcher: '/:path*' };
