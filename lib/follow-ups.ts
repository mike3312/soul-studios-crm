import { prisma } from '@/lib/prisma';
import { isWithinCustomerServiceWindow } from '@/lib/whatsapp';

export async function processPendingFollowUps(now = new Date()) {
  const pending = await prisma.lead.findMany({
    where: {
      aiEnabled: true,
      nextFollowUpAt: { lte: now },
      status: { notIn: ['Ganado', 'Perdido'] },
    },
    select: { id: true, lastCustomerMessageAt: true },
  });
  return {
    due: pending.length,
    eligibleForFreeForm: pending
      .filter((lead) =>
        isWithinCustomerServiceWindow(lead.lastCustomerMessageAt, now),
      )
      .map((lead) => lead.id),
    requiresTemplate: pending
      .filter(
        (lead) =>
          !isWithinCustomerServiceWindow(lead.lastCustomerMessageAt, now),
      )
      .map((lead) => lead.id),
  };
}
