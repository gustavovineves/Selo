/**
 * Script para criar o primeiro AdminUser de staging de forma segura.
 *
 * USO:
 *   DATABASE_URL="..." ADMIN_EMAIL="..." ADMIN_NAME="..." ADMIN_PASSWORD="..." \
 *     npx ts-node scripts/create-admin.ts
 *
 * Ou via pnpm:
 *   pnpm create-admin
 *
 * SEGURANÇA:
 * - Nunca hardcode senha aqui.
 * - Sempre use variável de ambiente ADMIN_PASSWORD.
 * - Gere a senha fora do repo (ex: openssl rand -base64 32).
 * - Após criar, remova ADMIN_PASSWORD do histórico do terminal.
 * - NUNCA commite .env com ADMIN_PASSWORD preenchido.
 *
 * DEPENDÊNCIAS:
 *   pnpm add -D ts-node @types/bcryptjs
 *   (bcryptjs e @prisma/client já estão no projeto)
 *
 * Ver docs/deploy-staging.md para instruções completas.
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const name = process.env.ADMIN_NAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !name || !password) {
    console.error('❌ Variáveis obrigatórias não definidas.');
    console.error('   ADMIN_EMAIL, ADMIN_NAME e ADMIN_PASSWORD são obrigatórias.');
    console.error('');
    console.error('   Exemplo:');
    console.error('   DATABASE_URL="..." ADMIN_EMAIL="admin@staging.app" ADMIN_NAME="Admin Staging" ADMIN_PASSWORD="<senha-forte>" npx ts-node scripts/create-admin.ts');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('❌ ADMIN_PASSWORD deve ter pelo menos 12 caracteres.');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não definida.');
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

  try {
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados.');

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      console.error(`❌ AdminUser com e-mail "${email}" já existe.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.adminUser.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    console.log('');
    console.log('✅ AdminUser criado com sucesso!');
    console.log(`   ID:    ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Nome:  ${admin.name}`);
    console.log(`   Role:  ${admin.role}`);
    console.log('');
    console.log('⚠️  Limpe a variável ADMIN_PASSWORD do histórico do terminal.');
    console.log('   history -c  (bash)  |  Clear-History  (PowerShell)');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Erro ao criar AdminUser:', err.message);
  process.exit(1);
});
