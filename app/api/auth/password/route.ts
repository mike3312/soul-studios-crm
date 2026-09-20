import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  allowAuthAttempt,
  authError,
  currentSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  trustedOrigin,
} from '@/lib/auth';
import { hashPassword, validPassword, verifyPassword } from '@/lib/auth-crypto';

export async function POST(request: Request) {
  if (!trustedOrigin(request.headers.get('origin')))
    return authError('Origen no permitido.', 403);
  try {
    const session = await currentSession();
    if (!session) return authError('Inicia sesión de nuevo.', 401);
    if (!(await allowAuthAttempt('password', 10)))
      return authError('Demasiados intentos. Espera 15 minutos.', 429);
    const text = await request.text();
    if (text.length > 4096)
      return authError('Solicitud demasiado grande.', 400);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return authError('Solicitud inválida.', 400);
    }
    if (
      !body ||
      typeof body.currentPassword !== 'string' ||
      body.currentPassword.length > 128 ||
      !validPassword(body.newPassword) ||
      body.newPassword !== body.confirmPassword
    )
      return authError(
        'Usa entre 12 y 128 caracteres y confirma la nueva contraseña.',
        400,
      );
    if (body.currentPassword === body.newPassword)
      return authError('La nueva contraseña debe ser diferente.', 400);
    const admin = await prisma.adminCredential.findUnique({
      where: { id: session.adminId },
    });
    if (
      !admin ||
      !(await verifyPassword(body.currentPassword, admin.passwordHash))
    )
      return authError('La contraseña actual no es correcta.', 400);
    const passwordHash = await hashPassword(body.newPassword);
    await prisma.$transaction(async (tx) => {
      const changed = await tx.adminCredential.updateMany({
        where: {
          id: admin.id,
          version: session.version,
          passwordHash: admin.passwordHash,
        },
        data: { passwordHash, version: { increment: 1 } },
      });
      if (changed.count !== 1) throw new Error('La sesión cambió.');
      await tx.adminSession.deleteMany({ where: { adminId: admin.id } });
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
    return authError(
      'No se pudo cambiar la contraseña. Inicia sesión de nuevo e inténtalo otra vez.',
      503,
    );
  }
}
