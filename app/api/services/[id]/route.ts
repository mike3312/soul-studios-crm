import { authorizeAdminRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authDenied = await authorizeAdminRequest(true);
  if (authDenied) return authDenied;

  try {
    const { id } = await params;
    const body = await request.json();
    return NextResponse.json(
      await prisma.service.update({
        where: { id: Number(id) },
        data: {
          name: body.name,
          description: body.description,
          startingPrice: body.startingPrice ? Number(body.startingPrice) : null,
          active: Boolean(body.active),
        },
      }),
    );
  } catch {
    return NextResponse.json(
      { error: 'No se pudo actualizar el servicio.' },
      { status: 400 },
    );
  }
}
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authDenied = await authorizeAdminRequest(true);
  if (authDenied) return authDenied;

  try {
    const { id } = await params;
    await prisma.service.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'No se pudo eliminar el servicio.' },
      { status: 400 },
    );
  }
}
