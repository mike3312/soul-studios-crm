import { requireAdminPage } from '@/lib/auth';
import { ServicesManager } from '@/components/services-manager';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export default async function ServicesPage() {
  await requireAdminPage();
  return (
    <ServicesManager
      initialServices={await prisma.service.findMany({
        orderBy: { createdAt: 'asc' },
      })}
    />
  );
}
