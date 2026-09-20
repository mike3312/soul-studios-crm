import { NextResponse } from 'next/server';
import {
  adminCredential,
  allowAuthAttempt,
  authError,
  issueSession,
  trustedOrigin,
} from '@/lib/auth';
import { equalText, verifyPassword } from '@/lib/auth-crypto';

export async function POST(request: Request) {
  if (!trustedOrigin(request.headers.get('origin')))
    return authError('Origen no permitido.', 403);
  try {
    if (!(await allowAuthAttempt('login')))
      return authError(
        'Demasiados intentos. Espera 15 minutos antes de volver a intentar.',
        429,
      );
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
      typeof body.username !== 'string' ||
      typeof body.password !== 'string' ||
      body.username.length > 191 ||
      body.password.length > 128
    )
      return authError('Usuario o contraseña incorrectos.', 401);
    const admin = await adminCredential();
    const passwordValid = await verifyPassword(
      body.password,
      admin.passwordHash,
    );
    if (!passwordValid || !equalText(body.username.trim(), admin.username))
      return authError('Usuario o contraseña incorrectos.', 401);
    return await issueSession(
      admin.id,
      admin.version,
      NextResponse.json({ ok: true }),
    );
  } catch {
    return authError('No se pudo iniciar sesión. Intenta de nuevo.', 503);
  }
}
