import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import { cleanupE2eData } from './global-setup';

// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

export default async function globalTeardown(): Promise<void> {
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
    console.log('\n[E2E] Global teardown: dados de teste removidos.');
  } finally {
    await prisma.$disconnect();
  }
}
