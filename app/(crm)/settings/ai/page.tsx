import { requireAdminPage } from '@/lib/auth';
import { AISettingsForm } from '@/components/ai-settings-form';
import { DEFAULT_SYSTEM_PROMPT } from '@/lib/constants';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export default async function AISettingsPage() {
  await requireAdminPage();

  const initial = await prisma.aISettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: 'Soul Studios',
      companyDescription:
        'Estudio digital que crea productos web, móviles y automatizaciones con IA.',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      tone: 'Profesional, amigable y natural',
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      humanHandoffForHot: true,
    },
  });
  return <AISettingsForm initial={initial} />;
}
