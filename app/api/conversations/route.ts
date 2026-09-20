import { authorizeAdminRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const authDenied = await authorizeAdminRequest(false);
  if (authDenied) return authDenied;

  return NextResponse.json(
    await prisma.conversation.findMany({
      include: {
        lead: { include: { service: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  );
}
