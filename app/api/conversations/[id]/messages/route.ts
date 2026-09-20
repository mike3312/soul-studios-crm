import { authorizeAdminRequest } from '@/lib/auth';
import { processIncomingMessage } from '@/lib/incoming-messages';
import { prisma } from '@/lib/prisma';
import {
  isWithinCustomerServiceWindow,
  sendWhatsAppTextMessage,
} from '@/lib/whatsapp';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authDenied = await authorizeAdminRequest(true);
  if (authDenied) return authDenied;

  try {
    const { id } = await params;
    const body = await request.json();
    if (
      typeof body.content !== 'string' ||
      !body.content.trim() ||
      !['customer', 'agent', 'ai'].includes(body.role)
    )
      return NextResponse.json({ error: 'Mensaje inválido.' }, { status: 400 });
    const conversation = await prisma.conversation.findUnique({
      where: { id: Number(id) },
      include: { lead: true },
    });
    if (!conversation)
      return NextResponse.json(
        { error: 'Conversación no encontrada.' },
        { status: 404 },
      );
    if (body.role === 'customer') {
      const result = await processIncomingMessage({
        phone: conversation.lead.phone,
        name: conversation.lead.name,
        text: body.content,
        source: 'Simulation',
        autoRespond: false,
      });
      return NextResponse.json(result, { status: 201 });
    }

    let externalId: string | null = null;
    if (conversation.lead.channel === 'whatsapp') {
      if (
        !isWithinCustomerServiceWindow(conversation.lead.lastCustomerMessageAt)
      ) {
        return NextResponse.json(
          {
            error:
              'La ventana de atención de 24 horas terminó. Prepara una plantilla aprobada por Meta antes de enviar.',
          },
          { status: 409 },
        );
      }
      externalId = (
        await sendWhatsAppTextMessage(conversation.lead.phone, body.content)
      ).externalId;
    }
    const now = new Date();
    const message = await prisma.message.create({
      data: {
        conversationId: Number(id),
        role: body.role,
        content: body.content.trim().slice(0, 4096),
        externalId,
      },
    });
    if (Number.isInteger(body.draftMessageId))
      await prisma.message.deleteMany({
        where: {
          id: body.draftMessageId,
          conversationId: Number(id),
          isDraft: true,
        },
      });
    await prisma.conversation.update({
      where: { id: Number(id) },
      data: {
        updatedAt: now,
        lead: {
          update: {
            updatedAt: now,
            ...(body.role === 'ai' ? { lastAiMessageAt: now } : {}),
          },
        },
      },
    });
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo guardar el mensaje.',
      },
      { status: 400 },
    );
  }
}
