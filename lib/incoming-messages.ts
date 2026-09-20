import { Prisma } from '@prisma/client';
import { processWhatsAppLeadAI, type WhatsAppLeadAnalysis } from '@/lib/ai';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import {
  isWithinCustomerServiceWindow,
  normalizeWhatsAppPhone,
  sendWhatsAppTextMessage,
} from '@/lib/whatsapp';

type IncomingMessageInput = {
  phone: string;
  name?: string | null;
  text: string;
  externalId?: string | null;
  source: 'WhatsApp' | 'Simulation';
  receivedAt?: Date;
  autoRespond?: boolean;
};

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

function cleanText(value: string) {
  const text = Array.from(value)
    .filter((character) => character.charCodeAt(0) !== 0)
    .join('')
    .trim()
    .slice(0, 4096);
  if (!text) throw new Error('El mensaje está vacío.');
  return text;
}

function cleanName(value: string | null | undefined, fallback: string) {
  return (
    Array.from(value || '')
      .filter((character) => {
        const code = character.charCodeAt(0);
        return code >= 32 && code !== 127;
      })
      .join('')
      .trim()
      .slice(0, 120) || fallback
  );
}

async function findLeadByPhone(phone: string) {
  const candidates = await prisma.lead.findMany({
    select: { id: true, phone: true },
  });
  const match = candidates.find(
    (candidate) => candidate.phone.replace(/\D/g, '') === phone,
  );
  return match
    ? prisma.lead.findUnique({
        where: { id: match.id },
        include: { conversation: true },
      })
    : null;
}

export async function processIncomingMessage(input: IncomingMessageInput) {
  const phone = normalizeWhatsAppPhone(input.phone);
  const text = cleanText(input.text);
  const externalId = input.externalId?.trim().slice(0, 255) || null;
  const receivedAt =
    input.receivedAt && Number.isFinite(input.receivedAt.getTime())
      ? input.receivedAt
      : new Date();

  if (externalId) {
    const existing = await prisma.message.findUnique({ where: { externalId } });
    if (existing)
      return { duplicate: true, conversationId: existing.conversationId };
  }

  try {
    let lead = await findLeadByPhone(phone);
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          name: cleanName(input.name, phone),
          phone,
          status: 'Nuevo',
          source: 'WhatsApp',
          channel: input.source === 'WhatsApp' ? 'whatsapp' : 'simulation',
          lastCustomerMessageAt: receivedAt,
          conversation: { create: {} },
        },
        include: { conversation: true },
      });
    } else if (!lead.conversation) {
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: { conversation: { create: {} } },
        include: { conversation: true },
      });
    }

    const conversationId = lead.conversation!.id;
    await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId,
          role: 'customer',
          content: text,
          externalId,
          createdAt: receivedAt,
        },
      }),
      prisma.lead.update({
        where: { id: lead.id },
        data: {
          lastCustomerMessageAt: receivedAt,
          ...(input.source === 'WhatsApp'
            ? { channel: 'whatsapp', source: 'WhatsApp' }
            : {}),
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: receivedAt },
      }),
    ]);

    if (input.autoRespond && input.source === 'WhatsApp' && lead.aiEnabled) {
      await processWhatsAppLead(conversationId);
    }
    return { duplicate: false, conversationId, leadId: lead.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      externalId
    ) {
      const existing = await prisma.message.findUnique({
        where: { externalId },
      });
      if (existing)
        return { duplicate: true, conversationId: existing.conversationId };
    }
    throw error;
  }
}

function relevantServices<T extends { name: string; description: string }>(
  services: T[],
  text: string,
  selectedName?: string,
) {
  const terms = text
    .toLocaleLowerCase('es')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length >= 4);
  const ranked = services.map((service) => ({
    service,
    score:
      (service.name === selectedName ? 10 : 0) +
      terms.filter((term) =>
        `${service.name} ${service.description}`
          .toLocaleLowerCase('es')
          .includes(term),
      ).length,
  }));
  return ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.service);
}

function enforceHotSignals(
  analysis: WhatsAppLeadAnalysis,
  latestCustomerText: string,
) {
  const hotSignal =
    /\b(cotizaci[oó]n|propuesta|presupuesto|precio|contratar|pagar|pago|reuni[oó]n|agendar|urgente|iniciar|empezar)\b/i.test(
      latestCustomerText,
    );
  const intentScore = Math.max(
    0,
    Math.min(100, Math.round(analysis.intent_score)),
  );
  return {
    ...analysis,
    intent_score: hotSignal ? Math.max(80, intentScore) : intentScore,
    lead_temperature:
      hotSignal || intentScore >= 80
        ? ('hot' as const)
        : analysis.lead_temperature,
  };
}

export async function processWhatsAppLead(conversationId: number) {
  const [conversation, services, settings] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        lead: { include: { service: true } },
        messages: {
          where: { isDraft: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    }),
    prisma.service.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    }),
    prisma.aISettings.upsert({
      where: { id: 1 },
      update: {},
      create: defaults,
    }),
  ]);
  if (!conversation)
    throw new Error('No se encontró la conversación para procesar.');
  if (!conversation.lead.aiEnabled) return { skipped: 'ai_disabled' as const };

  const history = [...conversation.messages].reverse();
  const latestCustomer = [...history]
    .reverse()
    .find((message) => message.role === 'customer');
  if (!latestCustomer) return { skipped: 'no_customer_message' as const };
  const analysis = enforceHotSignals(
    await processWhatsAppLeadAI({
      history,
      lead: conversation.lead,
      services: relevantServices(
        services,
        history.map((message) => message.content).join(' '),
        conversation.lead.service?.name,
      ),
      settings,
    }),
    latestCustomer.content,
  );

  const matchedService = services.find(
    (service) =>
      service.name.toLocaleLowerCase('es') ===
      analysis.service?.trim().toLocaleLowerCase('es'),
  );
  const needsHuman =
    analysis.lead_temperature === 'hot' &&
    (analysis.needs_human || settings.humanHandoffForHot);
  await prisma.lead.update({
    where: { id: conversation.leadId },
    data: {
      aiSummary: analysis.summary,
      leadTemperature: analysis.lead_temperature,
      intentScore: analysis.intent_score,
      recommendedAction: analysis.recommended_action,
      ...(analysis.budget == null ? {} : { budget: analysis.budget }),
      ...(matchedService ? { serviceId: matchedService.id } : {}),
      ...(needsHuman ? { aiEnabled: false } : {}),
    },
  });

  if (needsHuman) {
    await prisma.message.create({
      data: {
        conversationId,
        role: 'ai',
        content: analysis.reply,
        isDraft: true,
      },
    });
    return { analysis, drafted: true };
  }
  if (!isWithinCustomerServiceWindow(conversation.lead.lastCustomerMessageAt)) {
    return { analysis, skipped: 'outside_24h_window' as const };
  }

  const sent = await sendWhatsAppTextMessage(
    conversation.lead.phone,
    analysis.reply,
  );
  const now = new Date();
  await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        role: 'ai',
        content: analysis.reply,
        externalId: sent.externalId,
      },
    }),
    prisma.lead.update({
      where: { id: conversation.leadId },
      data: { lastAiMessageAt: now },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: now },
    }),
  ]);
  return { analysis, sent: true };
}
