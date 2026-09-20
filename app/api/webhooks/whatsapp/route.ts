import { processIncomingMessage } from '@/lib/incoming-messages';
import { verifyWhatsAppSignature } from '@/lib/whatsapp';
import { after, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

type WebhookMessage = {
  from?: unknown;
  id?: unknown;
  timestamp?: unknown;
  type?: unknown;
  text?: { body?: unknown };
};
type WebhookValue = {
  contacts?: Array<{ wa_id?: unknown; profile?: { name?: unknown } }>;
  messages?: WebhookMessage[];
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (!expected)
    return new NextResponse('Webhook no configurado', { status: 503 });
  if (mode === 'subscribe' && token === expected && challenge)
    return new NextResponse(challenge, { status: 200 });
  return new NextResponse('Verificación rechazada', { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (
    !verifyWhatsAppSignature(
      rawBody,
      request.headers.get('x-hub-signature-256'),
    )
  ) {
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }
  if (
    !payload ||
    typeof payload !== 'object' ||
    (payload as { object?: unknown }).object !== 'whatsapp_business_account'
  ) {
    return NextResponse.json({ received: true });
  }

  const jobs: Parameters<typeof processIncomingMessage>[0][] = [];
  const entries = Array.isArray((payload as { entry?: unknown }).entry)
    ? (payload as { entry: unknown[] }).entry.slice(0, 20)
    : [];
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const changes = Array.isArray((entry as { changes?: unknown }).changes)
      ? (entry as { changes: unknown[] }).changes.slice(0, 20)
      : [];
    for (const change of changes) {
      if (
        !change ||
        typeof change !== 'object' ||
        (change as { field?: unknown }).field !== 'messages'
      )
        continue;
      const value = (change as { value?: WebhookValue }).value;
      if (!value || typeof value !== 'object') continue;
      for (const message of (Array.isArray(value.messages)
        ? value.messages
        : []
      ).slice(0, 20)) {
        if (
          message?.type !== 'text' ||
          typeof message.from !== 'string' ||
          typeof message.id !== 'string' ||
          typeof message.text?.body !== 'string'
        )
          continue;
        const contact =
          value.contacts?.find((item) => item.wa_id === message.from) ||
          value.contacts?.[0];
        const seconds =
          typeof message.timestamp === 'string'
            ? Number(message.timestamp)
            : NaN;
        jobs.push({
          phone: message.from,
          name:
            typeof contact?.profile?.name === 'string'
              ? contact.profile.name
              : null,
          text: message.text.body,
          externalId: message.id,
          source: 'WhatsApp',
          receivedAt: Number.isFinite(seconds)
            ? new Date(seconds * 1000)
            : new Date(),
          autoRespond: true,
        });
      }
    }
  }

  if (jobs.length)
    after(async () => {
      for (const job of jobs) {
        try {
          await processIncomingMessage(job);
        } catch (error) {
          console.error(
            'No se pudo procesar un mensaje entrante de WhatsApp:',
            error instanceof Error ? error.message : 'Error desconocido',
          );
        }
      }
    });
  return NextResponse.json({ received: true });
}
