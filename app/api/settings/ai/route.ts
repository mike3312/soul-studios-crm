import { authorizeAdminRequest } from '@/lib/auth';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const defaults = {
  id: 1,
  companyName: 'Soul Studios',
  companyDescription:
    'Estudio digital que crea productos web, móviles y automatizaciones con IA.',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  tone: 'Profesional, amigable y natural',
  model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
  humanHandoffForHot: true,
};
export async function GET() {
  const authDenied = await authorizeAdminRequest(false);
  if (authDenied) return authDenied;

  return NextResponse.json(
    await prisma.aISettings.upsert({
      where: { id: 1 },
      update: {},
      create: defaults,
    }),
  );
}
export async function PUT(request: Request) {
  const authDenied = await authorizeAdminRequest(true);
  if (authDenied) return authDenied;

  try {
    const body = await request.json();
    return NextResponse.json(
      await prisma.aISettings.upsert({
        where: { id: 1 },
        update: {
          companyName: body.companyName,
          companyDescription: body.companyDescription,
          systemPrompt: body.systemPrompt,
          tone: body.tone,
          model: body.model,
          humanHandoffForHot: body.humanHandoffForHot === true,
        },
        create: {
          ...defaults,
          ...body,
          id: 1,
          humanHandoffForHot: body.humanHandoffForHot === true,
        },
      }),
    );
  } catch {
    return NextResponse.json(
      { error: 'No se pudo guardar la configuración.' },
      { status: 400 },
    );
  }
}
