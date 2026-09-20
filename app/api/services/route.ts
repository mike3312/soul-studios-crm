import { authorizeAdminRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const authDenied = await authorizeAdminRequest(false);
  if (authDenied) return authDenied;
  return NextResponse.json(
    await prisma.service.findMany({ orderBy: { createdAt: 'asc' } }),
  );
}
export async function POST(request: Request) {
  const authDenied = await authorizeAdminRequest(true);
  if (authDenied) return authDenied;

  try {
    const body = await request.json();
    if (!body.name?.trim() || !body.description?.trim())
      return NextResponse.json(
        { error: 'Nombre y descripción son obligatorios.' },
        { status: 400 },
      );
    return NextResponse.json(
      await prisma.service.create({
        data: {
          name: body.name.trim(),
          description: body.description.trim(),
          startingPrice: body.startingPrice ? Number(body.startingPrice) : null,
          active: body.active !== false,
        },
      }),
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          'No se pudo crear el servicio. Revisa que el nombre no esté repetido.',
      },
      { status: 400 },
    );
  }
}
