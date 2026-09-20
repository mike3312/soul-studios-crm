import { authorizeAdminRequest } from '@/lib/auth';
import { analyzeLead } from '@/lib/ai';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const authDenied = await authorizeAdminRequest(true);
  if (authDenied) return authDenied;

  try {
    const { conversationId } = await request.json();
    const [conversation, services, settings] = await Promise.all([
      prisma.conversation.findUnique({
        where: { id: Number(conversationId) },
        include: {
          lead: { include: { service: true } },
          messages: { orderBy: { createdAt: 'asc' } },
        },
      }),
      prisma.service.findMany({ where: { active: true } }),
      prisma.aISettings.findUnique({ where: { id: 1 } }),
    ]);
    if (!conversation || !settings)
      return NextResponse.json(
        { error: 'Falta la conversación o la configuración de IA.' },
        { status: 404 },
      );
    const analysis = await analyzeLead({
      history: conversation.messages,
      lead: conversation.lead,
      services,
      settings,
    });
    const temperature =
      analysis.nivel_interes === 'alto'
        ? 'hot'
        : analysis.nivel_interes === 'medio'
          ? 'warm'
          : 'cold';
    const intentScore =
      analysis.nivel_interes === 'alto'
        ? 85
        : analysis.nivel_interes === 'medio'
          ? 60
          : 30;
    const matchedService = services.find(
      (service) =>
        service.name.toLocaleLowerCase('es') ===
        analysis.servicio_recomendado.trim().toLocaleLowerCase('es'),
    );
    await prisma.lead.update({
      where: { id: conversation.leadId },
      data: {
        aiSummary: analysis.resumen,
        leadTemperature: temperature,
        intentScore,
        recommendedAction: analysis.accion_recomendada,
        ...(analysis.presupuesto_detectado != null
          ? { budget: analysis.presupuesto_detectado }
          : {}),
        ...(matchedService ? { serviceId: matchedService.id } : {}),
      },
    });
    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo analizar el prospecto.',
      },
      { status: 503 },
    );
  }
}
