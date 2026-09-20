import { authorizeAdminRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authDenied = await authorizeAdminRequest(false);
  if (authDenied) return authDenied;

  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id: Number(id) },
    include: {
      service: true,
      conversation: {
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      },
    },
  });
  return lead
    ? NextResponse.json(lead)
    : NextResponse.json({ error: 'Prospecto no encontrado.' }, { status: 404 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authDenied = await authorizeAdminRequest(true);
  if (authDenied) return authDenied;

  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};
    for (const key of [
      'name',
      'phone',
      'email',
      'company',
      'status',
      'source',
      'notes',
      'aiSummary',
      'leadTemperature',
      'recommendedAction',
    ])
      if (key in body) data[key] = body[key] === '' ? null : body[key];
    for (const key of ['budget', 'estimatedValue', 'serviceId', 'intentScore'])
      if (key in body)
        data[key] =
          body[key] === '' || body[key] == null ? null : Number(body[key]);
    if ('aiEnabled' in body) data.aiEnabled = body.aiEnabled === true;
    if ('nextFollowUpAt' in body) {
      const date = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
      if (date && !Number.isFinite(date.getTime()))
        return NextResponse.json(
          { error: 'Fecha de seguimiento inválida.' },
          { status: 400 },
        );
      data.nextFollowUpAt = date;
    }
    return NextResponse.json(
      await prisma.lead.update({
        where: { id: Number(id) },
        data,
        include: { service: true },
      }),
    );
  } catch {
    return NextResponse.json(
      { error: 'No se pudo actualizar el prospecto.' },
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
    await prisma.lead.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'No se pudo eliminar el prospecto.' },
      { status: 400 },
    );
  }
}
