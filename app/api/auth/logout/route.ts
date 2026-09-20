import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { digestToken } from '@/lib/auth-crypto';
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  trustedOrigin,
  authError,
} from '@/lib/auth';

export async function POST(request: Request) {
  if (!trustedOrigin(request.headers.get('origin')))
    return authError('Origen no permitido.', 403);
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token)
      await prisma.adminSession.deleteMany({
        where: { tokenHash: digestToken(token) },
      });
    const response = NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set(SESSION_COOKIE, '', {
      ...sessionCookieOptions,
      maxAge: 0,
    });
    return response;
  } catch {
    return authError('No se pudo cerrar la sesión. Intenta de nuevo.', 503);
  }
}
