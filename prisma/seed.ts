import { PrismaClient } from "@prisma/client";
import { DEFAULT_SYSTEM_PROMPT } from "../lib/constants";

const prisma = new PrismaClient();

async function main() {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.service.deleteMany();
  await prisma.aISettings.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({ data: { name: "Administrador", email: "admin@soulstudios.gt" } });
  const services = await Promise.all([
    ["Landing Page", "Página enfocada en convertir visitas en contactos o ventas.", 450],
    ["Página Web Empresarial", "Sitio profesional para presentar servicios, marca y canales de contacto.", 900],
    ["Tienda Online", "Catálogo, carrito y experiencia de compra en línea.", 1500],
    ["Aplicación Web", "Software web a medida para procesos y operaciones.", 2500],
    ["Aplicación Móvil", "Aplicación móvil para iOS y Android.", 3500],
    ["Automatización con IA", "Automatización de tareas y atención con inteligencia artificial.", 1200],
  ].map(([name, description, startingPrice]) => prisma.service.create({ data: { name: String(name), description: String(description), startingPrice: Number(startingPrice) } })));

  const [web, landing, app] = [services[1], services[0], services[3]];
  const carlos = await prisma.lead.create({ data: { name: "Carlos Pérez", phone: "+502 5555-0182", email: "carlos@nova.gt", company: "Restaurante Nova", status: "Calificado", budget: 1500, estimatedValue: 1200, source: "WhatsApp", notes: "Busca renovar la presencia digital del restaurante.", serviceId: web.id, conversation: { create: {} } }, include: { conversation: true } });
  const laura = await prisma.lead.create({ data: { name: "Laura Gómez", phone: "+502 5555-0137", email: "laura@lgarquitectura.com", company: "LG Arquitectura", status: "Nuevo", estimatedValue: 550, source: "Referido", serviceId: landing.id, conversation: { create: {} } }, include: { conversation: true } });
  const andres = await prisma.lead.create({ data: { name: "Andrés Torres", phone: "+502 5555-0199", email: "andres@logisticaexpress.com", company: "Logística Express", status: "Propuesta enviada", budget: 5000, estimatedValue: 4200, source: "WhatsApp", serviceId: app.id, conversation: { create: {} } }, include: { conversation: true } });

  await prisma.message.createMany({ data: [
    { conversationId: carlos.conversation!.id, role: "customer", content: "Hola, necesito una página para mi restaurante." },
    { conversationId: carlos.conversation!.id, role: "agent", content: "¡Hola Carlos! Claro que sí. ¿Buscas mostrar información o también necesitas menú, reservas o pedidos?" },
    { conversationId: laura.conversation!.id, role: "customer", content: "Me recomendaron con ustedes. Quiero captar clientes para mi estudio." },
    { conversationId: andres.conversation!.id, role: "agent", content: "Te envié la propuesta de la aplicación. ¿Deseas que revisemos juntos el alcance?" },
  ] });

  await prisma.aISettings.create({ data: { id: 1, companyName: "Soul Studios", companyDescription: "Estudio digital que crea productos web, móviles y automatizaciones con IA.", systemPrompt: DEFAULT_SYSTEM_PROMPT, tone: "Profesional, amigable y natural", model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini" } });
}

void main().finally(() => prisma.$disconnect());
