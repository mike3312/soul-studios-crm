import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_WHATSAPP_TEXT_LENGTH = 4096;

export function normalizeWhatsAppPhone(value: string) {
  const phone = value.replace(/\D/g, '');
  if (phone.length < 7 || phone.length > 15)
    throw new Error('El número de WhatsApp no es válido.');
  return phone;
}

export function isWithinCustomerServiceWindow(
  lastCustomerMessageAt: Date | null,
  now = new Date(),
) {
  return (
    !!lastCustomerMessageAt &&
    now.getTime() - lastCustomerMessageAt.getTime() <= 24 * 60 * 60 * 1000
  );
}

export function verifyWhatsAppSignature(
  rawBody: string,
  signature: string | null,
) {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!secret) return process.env.NODE_ENV !== 'production';
  if (!signature?.startsWith('sha256=')) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export async function sendWhatsAppTextMessage(
  phoneValue: string,
  textValue: string,
) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const version = process.env.WHATSAPP_API_VERSION?.trim();
  if (!token || !phoneNumberId || !version) {
    throw new Error(
      'Faltan WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_API_VERSION en .env.',
    );
  }

  const phone = normalizeWhatsAppPhone(phoneValue);
  const text = textValue.trim().slice(0, MAX_WHATSAPP_TEXT_LENGTH);
  if (!text) throw new Error('No se puede enviar un mensaje vacío.');

  const response = await fetch(
    `https://graph.facebook.com/${encodeURIComponent(version)}/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    },
  );
  const raw = await response.text();
  if (!response.ok) {
    let message = `Meta rechazó el mensaje (${response.status}).`;
    try {
      const parsed = JSON.parse(raw) as {
        error?: { message?: string; code?: number };
      };
      if (parsed.error?.message)
        message += ` ${parsed.error.message.slice(0, 220)}`;
      if (parsed.error?.code) message += ` Código ${parsed.error.code}.`;
    } catch {}
    throw new Error(message);
  }
  const data = JSON.parse(raw) as { messages?: Array<{ id?: string }> };
  const externalId = data.messages?.[0]?.id;
  if (!externalId)
    throw new Error(
      'Meta aceptó la solicitud, pero no devolvió el ID del mensaje.',
    );
  return { externalId };
}
