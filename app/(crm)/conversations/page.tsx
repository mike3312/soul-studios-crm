import { requireAdminPage } from '@/lib/auth';
import { ConversationsManager } from '@/components/conversations-manager';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  await requireAdminPage();

  const [conversations, params] = await Promise.all([
    prisma.conversation.findMany({
      include: {
        lead: { include: { service: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    searchParams,
  ]);
  return (
    <ConversationsManager
      initial={JSON.parse(JSON.stringify(conversations))}
      initialLeadId={params.lead ? Number(params.lead) : undefined}
    />
  );
}
