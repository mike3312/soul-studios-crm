import { authorizeAdminRequest } from '@/lib/auth';
import { generateSalesReply } from '@/lib/ai';
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
    const reply = await generateSalesReply({
      history: conversation.messages,
      lead: conversation.lead,
      services,
      settings,
    });
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo generar la respuesta.',
      },
      { status: 503 },
    );
  }
}
