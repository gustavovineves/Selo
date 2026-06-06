import { PrismaClient } from '@prisma/client';
import * as path from 'path';

// Load .env before anything else
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const E2E_EMAIL_DOMAIN = 'e2e-test.local';

export async function cleanupE2eData(prisma: PrismaClient): Promise<void> {
  const testEmails = [
    `e2e-alice@${E2E_EMAIL_DOMAIN}`,
    `e2e-bob@${E2E_EMAIL_DOMAIN}`,
    `e2e-carol@${E2E_EMAIL_DOMAIN}`,
  ];
  const testAdminEmail = `e2e-admin@${E2E_EMAIL_DOMAIN}`;

  const users = await prisma.user.findMany({ where: { email: { in: testEmails } }, select: { id: true } });
  const ids = users.map((u) => u.id);

  if (ids.length > 0) {
    const agreements = await prisma.agreement.findMany({
      where: {
        OR: [
          { createdById: { in: ids } },
          { payerId: { in: ids } },
          { receiverId: { in: ids } },
        ],
      },
      select: { id: true },
    });
    const agrIds = agreements.map((a) => a.id);

    if (agrIds.length > 0) {
      // Delete dependent records in order (respecting FK constraints)
      await prisma.refund.deleteMany({ where: { agreementId: { in: agrIds } } });
      await prisma.payout.deleteMany({ where: { agreementId: { in: agrIds } } });
      await prisma.paymentIntent.deleteMany({ where: { agreementId: { in: agrIds } } });
      // Deleting agreements cascades: participants, events, status history,
      // financial guarantee, dispute (+ messages), blockchain record
      await prisma.agreement.deleteMany({ where: { id: { in: agrIds } } });
    }

    // AuditLog has no cascade from User
    await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });

    // Deleting users cascades: sessions, receiving keys, receiving destinations,
    // trust score, trust score events, notifications
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  await prisma.adminUser.deleteMany({ where: { email: testAdminEmail } });
}

export default async function globalSetup(): Promise<void> {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url:
          process.env.DATABASE_URL ??
          'postgresql://selo:selopassword@127.0.0.1:5434/selodb?schema=public',
      },
    },
  });

  try {
    await prisma.$connect();
    await cleanupE2eData(prisma);
    console.log('\n[E2E] Global setup: dados de teste anteriores removidos.');
  } finally {
    await prisma.$disconnect();
  }
}
