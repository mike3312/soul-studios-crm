export const LEAD_STATUSES = [
  "Nuevo", "Contactado", "Calificado", "Propuesta enviada",
  "Negociación", "Pendiente de pago", "Ganado", "Perdido",
] as const;

export const STATUS_STYLES: Record<string, string> = {
  "Nuevo": "bg-sky-50 text-sky-700 ring-sky-100",
  "Contactado": "bg-cyan-50 text-cyan-700 ring-cyan-100",
  "Calificado": "bg-violet-50 text-violet-700 ring-violet-100",
  "Propuesta enviada": "bg-amber-50 text-amber-700 ring-amber-100",
  "Negociación": "bg-orange-50 text-orange-700 ring-orange-100",
  "Pendiente de pago": "bg-teal-50 text-teal-700 ring-teal-100",
  "Ganado": "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "Perdido": "bg-rose-50 text-rose-700 ring-rose-100",
};

export const DEFAULT_SYSTEM_PROMPT = `Eres el asistente comercial de Soul Studios.

Soul Studios desarrolla páginas web, landing pages, ecommerce, aplicaciones web, aplicaciones móviles y automatizaciones con IA.

Tu objetivo es ayudar a convertir conversaciones en oportunidades comerciales.

Debes conversar de forma profesional, amigable y natural. No presiones al prospecto. Primero intenta comprender qué necesita. Haz máximo una o dos preguntas a la vez. Cuando tengas suficiente información recomienda el servicio más apropiado. Nunca inventes precios. Utiliza únicamente los servicios y precios registrados en el sistema. Si el proyecto requiere funcionalidades personalizadas, indica que Soul Studios debe realizar una cotización personalizada.

Tu función es ayudar a calificar al prospecto y avanzar la conversación hacia una propuesta o reunión.`;
