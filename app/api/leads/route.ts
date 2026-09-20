import { authorizeAdminRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const authDenied = await authorizeAdminRequest(false);
  if (authDenied) return authDenied;

  return NextResponse.json(
    await prisma.lead.findMany({
      include: {
        service: true,
        conversation: {
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  );
}

export async function POST(request: Request) {
  const authDenied = await authorizeAdminRequest(true);
  if (authDenied) return authDenied;

  try {
    const body = await request.json();
    if (!body.name?.trim() || !body.phone?.trim())
      return NextResponse.json(
        { error: 'Nombre y teléfono son obligatorios.' },
        { status: 400 },
      );
    const lead = await prisma.lead.create({
      data: {
        name: body.name.trim(),
        phone: body.phone.trim(),
        email: body.email?.trim() || null,
        company: body.company?.trim() || null,
        status: body.status || 'Nuevo',
        budget: body.budget ? Number(body.budget) : null,
        estimatedValue: body.estimatedValue
          ? Number(body.estimatedValue)
          : null,
        source: body.source?.trim() || 'WhatsApp',
        notes: body.notes?.trim() || null,
        serviceId: body.serviceId ? Number(body.serviceId) : null,
        conversation: { create: {} },
      },
      include: { service: true, conversation: true },
    });
    return NextResponse.json(lead, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'No se pudo crear el prospecto.' },
      { status: 500 },
    );
  }
}
