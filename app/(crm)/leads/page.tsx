import { requireAdminPage } from '@/lib/auth';
import { LeadsManager } from '@/components/leads-manager';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export default async function LeadsPage() {
  await requireAdminPage();

  const [leads, services] = await Promise.all([
    prisma.lead.findMany({
      include: {
        service: true,
        conversation: {
          include: { messages: { orderBy: { createdAt: 'asc' } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.service.findMany({ orderBy: { name: 'asc' } }),
  ]);
  return (
    <LeadsManager
      initialLeads={JSON.parse(JSON.stringify(leads))}
      services={services}
    />
  );
}
