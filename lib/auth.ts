import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { digestToken, hashPassword, newSessionToken } from '@/lib/auth-crypto';

export const SESSION_COOKIE =
  process.env.NODE_ENV === 'production'
    ? '__Host-soul-session'
    : 'soul-session';
export const SESSION_SECONDS = 8 * 60 * 60;
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

// The environment password only initializes the singleton. After initialization,
// the old environment password is never used as a fallback.
export async function adminCredential() {
  const existing = await prisma.adminCredential.findUnique({
    where: { id: 1 },
  });
  if (existing) return existing;
  const username = process.env.CRM_ADMIN_USER?.trim();
  const password = process.env.CRM_ADMIN_PASSWORD;
  if (!username || !password) throw new Error('Administrador no configurado.');
  return prisma.adminCredential.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, username, passwordHash: await hashPassword(password) },
  });
}

export async function sessionForToken(token: string | undefined) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: digestToken(token) },
    include: { admin: { select: { version: true, username: true } } },
  });
  if (
    !session ||
    session.expiresAt.getTime() <= Date.now() ||
    session.version !== session.admin.version
  )
    return null;
  return {
    adminId: session.adminId,
    username: session.admin.username,
    tokenHash: session.tokenHash,
    version: session.version,
  };
}

export async function currentSession() {
  return sessionForToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireAdminPage() {
  const session = await currentSession();
  if (!session) redirect('/login');
  return session;
}

export function trustedOrigin(origin: string | null) {
  if (!origin) return false;
  try {
    const expected = new URL(
      process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.NODE_ENV === 'production'
          ? 'https://crmsoul.oficinabetel.com'
          : 'http://localhost:3000'),
    ).origin;
    return origin === expected;
  } catch {
    return false;
  }
}

export function authError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function authorizeAdminRequest(mutation = false) {
  if (mutation && !trustedOrigin((await headers()).get('origin')))
    return authError('Origen de solicitud no permitido.', 403);
  if (!(await currentSession()))
    return authError('Tu sesión terminó. Inicia sesión de nuevo.', 401);
  return null;
}

export async function issueSession(
  adminId: number,
  version: number,
  response: NextResponse,
) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await prisma.adminSession.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  await prisma.adminSession.create({
    data: { tokenHash: digestToken(token), adminId, version, expiresAt },
  });
  response.cookies.set(SESSION_COOKIE, token, {
    ...sessionCookieOptions,
    maxAge: SESSION_SECONDS,
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

// Fixed, database-backed budgets for this single-admin installation. Changing
// usernames or spoofing forwarded IP headers cannot bypass the limits.
export async function allowAuthAttempt(id: 'login' | 'password', limit = 20) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
  await prisma.authRateLimit.upsert({
    where: { id },
    create: { id, count: 0, expiresAt },
    update: {},
  });
  await prisma.authRateLimit.updateMany({
    where: { id, expiresAt: { lte: now } },
    data: { count: 0, expiresAt },
  });
  const reserved = await prisma.authRateLimit.updateMany({
    where: { id, count: { lt: limit } },
    data: { count: { increment: 1 } },
  });
  return reserved.count === 1;
}
