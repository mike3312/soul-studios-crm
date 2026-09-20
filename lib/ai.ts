type LeadContext = {
  name: string;
  company: string | null;
  status: string;
  budget: number | null;
  estimatedValue: number | null;
  notes: string | null;
  aiSummary?: string | null;
  service?: { name: string } | null;
};
type ServiceContext = {
  name: string;
  description: string;
  startingPrice: number | null;
};
type SettingsContext = {
  companyName: string;
  companyDescription: string;
  systemPrompt: string;
  tone: string;
  model: string;
};
type HistoryMessage = { role: string; content: string };

async function openRouter(
  messages: { role: string; content: string }[],
  model: string,
  json = false,
) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key)
    throw new Error(
      'Configura OPENROUTER_API_KEY en el archivo .env para usar la IA.',
    );
  const response = await fetch(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer':
          process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Soul Studios CRM',
      },
      body: JSON.stringify({
        model: model || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
        messages,
        temperature: 0.45,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OpenRouter no pudo generar la respuesta (${response.status}). ${detail.slice(0, 180)}`,
    );
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter devolvió una respuesta vacía.');
  return content as string;
}

function context(
  lead: LeadContext,
  services: ServiceContext[],
  settings: SettingsContext,
) {
  const catalog = services
    .map(
      (s) =>
        `- ${s.name}: ${s.description} (precio desde: ${s.startingPrice == null ? 'cotización' : `$${s.startingPrice}`})`,
    )
    .join('\n');
  return `${settings.systemPrompt}\n\nEmpresa: ${settings.companyName}\nDescripción: ${settings.companyDescription}\nTono: ${settings.tone}\n\nProspecto:\n${JSON.stringify(lead, null, 2)}\n\nServicios registrados:\n${catalog}`;
}

export async function generateSalesReply(input: {
  history: HistoryMessage[];
  lead: LeadContext;
  services: ServiceContext[];
  settings: SettingsContext;
}) {
  const messages = input.history.map((m) => ({
    role: m.role === 'customer' ? 'user' : 'assistant',
    content: m.content,
  }));
  return openRouter(
    [
      {
        role: 'system',
        content: context(input.lead, input.services, input.settings),
      },
      ...messages,
      {
        role: 'user',
        content:
          'Redacta únicamente la siguiente respuesta sugerida para el prospecto. No agregues explicaciones ni comillas.',
      },
    ],
    input.settings.model,
  );
}

export async function analyzeLead(input: {
  history: HistoryMessage[];
  lead: LeadContext;
  services: ServiceContext[];
  settings: SettingsContext;
}) {
  const raw = await openRouter(
    [
      {
        role: 'system',
        content: context(input.lead, input.services, input.settings),
      },
      {
        role: 'user',
        content: `Analiza este historial: ${JSON.stringify(input.history)}. Devuelve solamente JSON válido con exactamente estas claves: resumen (string), servicio_recomendado (string), nivel_interes ("bajo" | "medio" | "alto"), presupuesto_detectado (number | null), accion_recomendada (string).`,
      },
    ],
    input.settings.model,
    true,
  );
  try {
    const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''));
    if (
      typeof parsed.resumen !== 'string' ||
      typeof parsed.servicio_recomendado !== 'string' ||
      !['bajo', 'medio', 'alto'].includes(parsed.nivel_interes) ||
      (parsed.presupuesto_detectado !== null &&
        typeof parsed.presupuesto_detectado !== 'number') ||
      typeof parsed.accion_recomendada !== 'string'
    )
      throw new Error();
    return parsed as {
      resumen: string;
      servicio_recomendado: string;
      nivel_interes: 'bajo' | 'medio' | 'alto';
      presupuesto_detectado: number | null;
      accion_recomendada: string;
    };
  } catch {
    throw new Error(
      'La IA respondió, pero el análisis no tenía el formato esperado. Intenta de nuevo.',
    );
  }
}

export type WhatsAppLeadAnalysis = {
  reply: string;
  service: string | null;
  lead_temperature: 'cold' | 'warm' | 'hot';
  intent_score: number;
  budget: number | null;
  summary: string;
  recommended_action: string;
  needs_human: boolean;
};

export async function processWhatsAppLeadAI(input: {
  history: HistoryMessage[];
  lead: LeadContext;
  services: ServiceContext[];
  settings: SettingsContext;
}) {
  const schema = `{
  "reply": "respuesta lista para enviar",
  "service": null,
  "lead_temperature": "cold|warm|hot",
  "intent_score": 0,
  "budget": null,
  "summary": "",
  "recommended_action": "",
  "needs_human": false
}`;
  const instructions = `${context(input.lead, input.services, input.settings)}

Analiza la conversación como asistente comercial. Comprende la necesidad, aclara solo lo imprescindible, recomienda únicamente servicios del catálogo y detecta presupuesto, urgencia, solicitud de cotización, propuesta, reunión o intención de compra. Una solicitud clara de precio, propuesta, reunión, contratación, pago, inicio o urgencia es una señal HOT; toda intención de 80 o más debe ser HOT. Haz como máximo dos preguntas naturales en reply. No inventes precios, descuentos, disponibilidad ni datos. Marca needs_human cuando el caso necesite negociación, una cotización personalizada, una decisión sensible o intervención del equipo.

Devuelve únicamente JSON válido con exactamente esta estructura:
${schema}`;
  const raw = await openRouter(
    [
      { role: 'system', content: instructions },
      {
        role: 'user',
        content: `Lead y resumen previo: ${JSON.stringify(input.lead)}\nÚltimos mensajes: ${JSON.stringify(input.history)}`,
      },
    ],
    input.settings.model,
    true,
  );

  try {
    const parsed = JSON.parse(
      raw.replace(/^```json\s*|\s*```$/g, ''),
    ) as Partial<WhatsAppLeadAnalysis>;
    if (
      typeof parsed.reply !== 'string' ||
      !parsed.reply.trim() ||
      (parsed.service !== null && typeof parsed.service !== 'string') ||
      !['cold', 'warm', 'hot'].includes(String(parsed.lead_temperature)) ||
      typeof parsed.intent_score !== 'number' ||
      !Number.isFinite(parsed.intent_score) ||
      (parsed.budget !== null && typeof parsed.budget !== 'number') ||
      typeof parsed.summary !== 'string' ||
      typeof parsed.recommended_action !== 'string' ||
      typeof parsed.needs_human !== 'boolean'
    )
      throw new Error();
    return {
      reply: parsed.reply.trim(),
      service: parsed.service?.trim() || null,
      lead_temperature:
        parsed.lead_temperature as WhatsAppLeadAnalysis['lead_temperature'],
      intent_score: parsed.intent_score,
      budget: parsed.budget ?? null,
      summary: parsed.summary.trim(),
      recommended_action: parsed.recommended_action.trim(),
      needs_human: parsed.needs_human,
    } satisfies WhatsAppLeadAnalysis;
  } catch {
    throw new Error(
      'La IA respondió, pero la clasificación de WhatsApp no tenía el formato esperado.',
    );
  }
}
