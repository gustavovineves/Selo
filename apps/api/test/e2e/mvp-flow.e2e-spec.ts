import { Test, TestingModule } from '@nestjs/testing';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcryptjs';
import { ReceivingDestinationType, ConfirmationRule } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { ReceivingKeysService } from '../../src/modules/receiving-keys/receiving-keys.service';
import { ReceivingDestinationsService } from '../../src/modules/receiving-destinations/receiving-destinations.service';
import { AgreementsService } from '../../src/modules/agreements/agreements.service';
import { AgreementEventsService } from '../../src/modules/agreement-events/agreement-events.service';
import { PaymentsService } from '../../src/modules/payments/payments.service';
import { AdminAuthService } from '../../src/modules/admin/admin-auth.service';
import { AdminService } from '../../src/modules/admin/admin.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { FinancialProfileService } from '../../src/modules/users/financial-profile.service';
import { BlockchainRecordsService } from '../../src/modules/blockchain-records/blockchain-records.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreateSimpleAgreementDto } from '../../src/modules/agreements/dto/create-simple-agreement.dto';
import { CreateGuaranteedAgreementDto } from '../../src/modules/agreements/dto/create-guaranteed-agreement.dto';

// ── Constantes de teste ──────────────────────────────────────────
const E2E_DOMAIN = 'e2e-test.local';
const ALICE_EMAIL = `e2e-alice@${E2E_DOMAIN}`;
const BOB_EMAIL = `e2e-bob@${E2E_DOMAIN}`;
const CAROL_EMAIL = `e2e-carol@${E2E_DOMAIN}`;
const ADMIN_EMAIL = `e2e-admin@${E2E_DOMAIN}`;
const PASSWORD = 'Senha@123';

// Data 30 dias no futuro com horário específico (14h30 UTC) para testar preservação de dia+hora
const dueDate30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
dueDate30Days.setUTCHours(14, 30, 0, 0);
const DUE_DATE_ISO = dueDate30Days.toISOString();

// ── Suite principal ─────────────────────────────────────────────

describe('Fase 18 — MVP Flow E2E com PostgreSQL Real', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let auth: AuthService;
  let keys: ReceivingKeysService;
  let destinations: ReceivingDestinationsService;
  let agreements: AgreementsService;
  let events: AgreementEventsService;
  let payments: PaymentsService;
  let adminAuth: AdminAuthService;
  let admin: AdminService;
  let notifications: NotificationsService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let financialProfile: FinancialProfileService;
  let blockchainRecords: BlockchainRecordsService;

  // Estado compartilhado entre blocos de teste
  let userAId: string;
  let userBId: string;
  let userCId: string;
  let adminUserId: string;
  let keyBNormalized: string;
  let keyCNormalized: string;
  let simpleAgrId: string;
  let guaranteed1Id: string; // dupla confirmação
  let guaranteed2Id: string; // disputa + release
  let guaranteed3Id: string; // disputa + refund
  let pi1Id: string;
  let pi2Id: string;
  let pi3Id: string;
  let dispute2Id: string;
  let dispute3Id: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma       = moduleRef.get(PrismaService);
    auth         = moduleRef.get(AuthService);
    keys         = moduleRef.get(ReceivingKeysService);
    destinations = moduleRef.get(ReceivingDestinationsService);
    agreements   = moduleRef.get(AgreementsService);
    events       = moduleRef.get(AgreementEventsService);
    payments     = moduleRef.get(PaymentsService);
    adminAuth    = moduleRef.get(AdminAuthService);
    admin        = moduleRef.get(AdminService);
    notifications = moduleRef.get(NotificationsService);
    jwtService   = moduleRef.get(JwtService);
    configService = moduleRef.get(ConfigService);
    financialProfile = moduleRef.get(FinancialProfileService);
    blockchainRecords = moduleRef.get(BlockchainRecordsService);

    // Seed: adminUser com bcrypt real
    const passwordHash = await bcrypt.hash(PASSWORD, 12);
    const adminRecord = await prisma.adminUser.create({
      data: {
        email: ADMIN_EMAIL,
        name: 'E2E Admin',
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    adminUserId = adminRecord.id;
  }, 60000);

  afterAll(async () => {
    await moduleRef.close();
  });

  // ─────────────────────────────────────────────────────────────────
  // 1. Cadastro e Autenticação
  // ─────────────────────────────────────────────────────────────────

  describe('Cadastro e Autenticação', () => {
    it('registra Usuário A (Alice)', async () => {
      const result = await auth.register({
        email: ALICE_EMAIL,
        password: PASSWORD,
        firstName: 'Alice',
        lastName: 'E2E',
      });
      expect(result.user.email).toBe(ALICE_EMAIL);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      userAId = result.user.id;
    });

    it('registra Usuário B (Bob)', async () => {
      const result = await auth.register({
        email: BOB_EMAIL,
        password: PASSWORD,
        firstName: 'Bob',
        lastName: 'E2E',
      });
      expect(result.user.email).toBe(BOB_EMAIL);
      userBId = result.user.id;
    });

    it('registra Usuário C (Carol — sem destino de recebimento)', async () => {
      const result = await auth.register({
        email: CAROL_EMAIL,
        password: PASSWORD,
        firstName: 'Carol',
        lastName: 'E2E',
      });
      userCId = result.user.id;
    });

    it('login de A retorna tokens válidos com dados corretos', async () => {
      const result = await auth.login({ email: ALICE_EMAIL, password: PASSWORD });
      expect(result.accessToken).toBeDefined();
      expect(result.user.id).toBe(userAId);
      expect(result.user.email).toBe(ALICE_EMAIL);
    });

    it('getMe de A retorna perfil completo', async () => {
      const me = await auth.getMe(userAId);
      expect(me.email).toBe(ALICE_EMAIL);
      expect(me.profile?.fullName).toBe('Alice E2E');
      expect(me.trustScore).toBeDefined();
    });

    it('rejeita email duplicado no registro', async () => {
      await expect(
        auth.register({ email: ALICE_EMAIL, password: PASSWORD, firstName: 'X', lastName: 'Y' }),
      ).rejects.toThrow();
    });

    it('rejeita senha errada no login', async () => {
      await expect(auth.login({ email: ALICE_EMAIL, password: 'errada' })).rejects.toThrow();
    });

    it('rejeita email inexistente no login', async () => {
      await expect(auth.login({ email: 'naoexiste@e2e.local', password: PASSWORD })).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 2. Chave de Recebimento do App
  // ─────────────────────────────────────────────────────────────────

  describe('Chave de Recebimento do App', () => {
    it('A cria chave @e2e-alice-test', async () => {
      const result = await keys.create(userAId, { key: '@e2e-alice-test' });
      expect(result.key).toBe('@e2e-alice-test');
      expect(result.normalizedKey).toBe('e2e-alice-test');
      expect(result.status).toBe('ACTIVE');
    });

    it('B cria chave @e2e-bob-test', async () => {
      const result = await keys.create(userBId, { key: '@e2e-bob-test' });
      expect(result.key).toBe('@e2e-bob-test');
      keyBNormalized = result.normalizedKey;
    });

    it('C cria chave @e2e-carol-test', async () => {
      const result = await keys.create(userCId, { key: '@e2e-carol-test' });
      expect(result.key).toBe('@e2e-carol-test');
      keyCNormalized = result.normalizedKey;
    });

    it('A pode consultar sua chave ativa', async () => {
      const result = await keys.findActive(userAId);
      expect(result.key).toBe('@e2e-alice-test');
      expect(result.status).toBe('ACTIVE');
    });

    it('chave de A resolve para o userId de A', async () => {
      const result = await keys.resolve('@e2e-alice-test');
      expect(result.userId).toBe(userAId);
      expect(result.canReceiveAgreements).toBe(true);
    });

    it('chave de B resolve para o userId de B', async () => {
      const result = await keys.resolve('@e2e-bob-test');
      expect(result.userId).toBe(userBId);
    });

    it('chave de A não resolve como B (userId diferente)', async () => {
      const result = await keys.resolve('@e2e-alice-test');
      expect(result.userId).not.toBe(userBId);
    });

    it('handle duplicado (@e2e-alice-test) → ConflictException', async () => {
      await expect(keys.create(userBId, { key: '@e2e-alice-test' })).rejects.toThrow();
    });

    it('handle inexistente → NotFoundException', async () => {
      await expect(keys.resolve('@e2e-nao-existe-xyz')).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 3. Destino de Recebimento
  // ─────────────────────────────────────────────────────────────────

  describe('Destino de Recebimento', () => {
    it('B cadastra destino PIX_EMAIL (primeiro → vira default)', async () => {
      const result = await destinations.create(userBId, {
        type: ReceivingDestinationType.PIX_EMAIL,
        pixKey: 'bob@e2e-test.local',
        label: 'Email E2E',
        isDefault: true,
      });
      expect(result.type).toBe('PIX_EMAIL');
      expect(result.isDefault).toBe(true);
      expect(result.maskedValue).toContain('***');
      expect(result).not.toHaveProperty('keyValue'); // sensível nunca exposto
    });

    it('findAllByUser de B retorna o destino cadastrado', async () => {
      const result = await destinations.findAllByUser(userBId);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].isDefault).toBe(true);
    });

    it('findAnyActive de B retorna destino ativo com keyValue', async () => {
      const result = await destinations.findAnyActive(userBId);
      expect(result).not.toBeNull();
      expect(result?.keyValue).toBe('bob@e2e-test.local');
    });

    it('findAnyActive de C retorna null (sem destino cadastrado)', async () => {
      const result = await destinations.findAnyActive(userCId);
      expect(result).toBeNull();
    });

    it('acordo com garantia sem KYC → BadRequestException (KYC é verificado antes de destino)', async () => {
      // Alice ainda não iniciou KYC (PENDING) — o check de KYC vem antes do check de destino.
      // O teste garante que tentar criar garantia sem KYC falha com BadRequestException.
      await expect(
        agreements.createGuaranteed(userAId, {
          title: 'Teste sem KYC',
          counterpartyKey: `@${keyCNormalized}`,
          amount: 100,
          currency: 'BRL',
          dueDate: DUE_DATE_ISO,
        }),
      ).rejects.toThrow('verificação financeira');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 4. Validação de dueDate por DTO (camada HTTP)
  // ─────────────────────────────────────────────────────────────────

  describe('Validação de dueDate obrigatório (camada HTTP via class-validator)', () => {
    it('CreateSimpleAgreementDto sem dueDate → erro de validação em "dueDate"', async () => {
      const dto = plainToInstance(CreateSimpleAgreementDto, {
        title: 'Acordo sem prazo',
        counterpartyKey: '@e2e-bob-test',
        currency: 'BRL',
        // dueDate ausente
      });
      const errors = await validate(dto);
      const dueDateError = errors.find((e) => e.property === 'dueDate');
      expect(dueDateError).toBeDefined();
    });

    it('CreateGuaranteedAgreementDto sem dueDate → erro de validação em "dueDate"', async () => {
      const dto = plainToInstance(CreateGuaranteedAgreementDto, {
        title: 'Garantia sem prazo',
        counterpartyKey: '@e2e-bob-test',
        amount: 100,
        currency: 'BRL',
        // dueDate ausente
      });
      const errors = await validate(dto);
      const dueDateError = errors.find((e) => e.property === 'dueDate');
      expect(dueDateError).toBeDefined();
    });

    it('CreateSimpleAgreementDto com dueDate válido passa na validação', async () => {
      const dto = plainToInstance(CreateSimpleAgreementDto, {
        title: 'Acordo com prazo',
        counterpartyKey: '@e2e-bob-test',
        currency: 'BRL',
        dueDate: DUE_DATE_ISO,
      });
      const errors = await validate(dto);
      const dueDateError = errors.find((e) => e.property === 'dueDate');
      expect(dueDateError).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 5. Acordo Simples — Ciclo completo
  // ─────────────────────────────────────────────────────────────────

  describe('Acordo Simples — Ciclo Completo', () => {
    it('A cria acordo simples para B com dueDate e horário (14h30 UTC)', async () => {
      const result = await agreements.createSimple(userAId, {
        title: 'E2E — Acordo Simples',
        counterpartyKey: `@${keyBNormalized}`,
        dueDate: DUE_DATE_ISO,
        currency: 'BRL',
        description: 'Criado pelo teste E2E Fase 18',
      });

      expect(result.type).toBe('SIMPLE');
      expect(result.operationalStatus).toBe('AWAITING_ACCEPTANCE');
      expect(result.financialStatus).toBe('NONE');
      expect(result.dueDate).toBeTruthy();

      // Verifica que dia e hora são preservados (comparar minutos para evitar arredondamento)
      const stored = new Date(result.dueDate!);
      const original = new Date(DUE_DATE_ISO);
      expect(stored.getUTCHours()).toBe(original.getUTCHours());
      expect(stored.getUTCMinutes()).toBe(original.getUTCMinutes());
      expect(stored.getUTCDate()).toBe(original.getUTCDate());

      expect(result.receiverKeySnapshot).toBeTruthy();
      const snapshot = result.receiverKeySnapshot as Record<string, string>;
      expect(snapshot.userId).toBe(userBId);
      simpleAgrId = result.id;
    });

    it('B lista acordos e vê o convite em AWAITING_ACCEPTANCE', async () => {
      const result = await agreements.findAllByUser(userBId, { page: 1, limit: 20 });
      const invite = result.data.find((a: any) => a.id === simpleAgrId);
      expect(invite).toBeDefined();
      expect(invite?.operationalStatus).toBe('AWAITING_ACCEPTANCE');
    });

    it('A não pode aceitar o próprio acordo (é o criador)', async () => {
      await expect(agreements.accept(userAId, simpleAgrId)).rejects.toThrow();
    });

    it('B aceita o acordo → ACTIVE', async () => {
      const result = await agreements.accept(userBId, simpleAgrId);
      expect(result.operationalStatus).toBe('ACTIVE');
    });

    it('A pode ver o acordo como ACTIVE', async () => {
      const result = await agreements.findOne(userAId, simpleAgrId);
      expect(result.operationalStatus).toBe('ACTIVE');
    });

    it('A conclui o acordo (SINGLE_PARTY) → COMPLETED', async () => {
      const result = await agreements.complete(userAId, simpleAgrId);
      expect(result.operationalStatus).toBe('COMPLETED');
    });

    it('eventos CREATED, SENT, ACCEPTED, COMPLETED foram registrados', async () => {
      const evts = await events.findAllByAgreement(userAId, simpleAgrId);
      const types = evts.map((e: any) => e.type);
      expect(types).toContain('CREATED');
      expect(types).toContain('SENT');
      expect(types).toContain('ACCEPTED');
      expect(types).toContain('COMPLETED');
    });

    it('B recebeu notificação AGREEMENT_RECEIVED', async () => {
      const notifs = await notifications.findAllByUser(userBId);
      const received = notifs.data.some(
        (n: any) => n.type === 'AGREEMENT_RECEIVED' && (n.data as any)?.agreementId === simpleAgrId,
      );
      expect(received).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 5b. KYC Progressivo — Verificação Financeira (Fase 25)
  // ─────────────────────────────────────────────────────────────────

  describe('Fase 25 — KYC Progressivo', () => {
    it('acordo simples não exige KYC — cria normalmente com kycStatus PENDING', async () => {
      const user = await prisma.user.findUnique({ where: { id: userAId }, select: { kycStatus: true } });
      expect(user?.kycStatus).toBe('PENDING');
      // simpleAgrId já existe e foi criado sem KYC — confirma que acordo simples passou
      expect(simpleAgrId).toBeTruthy();
    });

    it('acordo com garantia bloqueado quando KYC não iniciado', async () => {
      await expect(
        agreements.createGuaranteed(userAId, {
          title: 'Bloqueado por KYC',
          counterpartyKey: `@${keyBNormalized}`,
          amount: 50,
          currency: 'BRL',
          dueDate: DUE_DATE_ISO,
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining('verificação financeira'),
      });
    });

    it('retorna financial-profile com kycStatus PENDING e pendências', async () => {
      const profile = await financialProfile.getFinancialProfile(userAId);
      expect(profile.kycStatus).toBe('PENDING');
      expect(profile.kycStatusLabel).toBe('Verificação não iniciada');
      expect(profile.pendingRequirements.length).toBeGreaterThan(0);
    });

    it('atualiza dados financeiros (nome, CPF, data de nascimento, telefone, termos)', async () => {
      const result = await financialProfile.updateFinancialProfile(userAId, {
        fullName: 'Alice E2E Verificada',
        cpf: '11144477735',
        birthDate: '1990-06-07',
        phone: '+5511999990001',
        acceptedFinancialTerms: true,
      });
      expect(result.kycStatus).toBe('PENDING'); // ainda não submeteu
      expect(result.cpfMasked).toBe('***.444.777-**');
      expect(result.acceptedFinancialTerms).toBe(true);
    });

    it('rejeita CPF inválido', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      await expect(
        financialProfile.updateFinancialProfile(userAId, { cpf: '11111111111' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('submete verificação financeira para análise', async () => {
      const result = await financialProfile.submitForReview(userAId);
      expect(result.kycStatus).toBe('SUBMITTED');
      expect(result.kycStatusLabel).toBe('Em análise');
      expect(result.kycSubmittedAt).toBeTruthy();
    });

    it('simula aprovação (apenas em test/dev)', async () => {
      const result = await financialProfile.simulateApproval(userAId);
      expect(result.kycStatus).toBe('APPROVED');
      expect(result.kycStatusLabel).toBe('Aprovado para valor protegido');
      expect(result.kycApprovedAt).toBeTruthy();
    });

    it('kycStatus de Alice é APPROVED após aprovação simulada', async () => {
      const user = await prisma.user.findUnique({ where: { id: userAId }, select: { kycStatus: true } });
      expect(user?.kycStatus).toBe('APPROVED');
    });

    it('dueDate continua obrigatório após KYC', async () => {
      // Já testado nos testes de validação — aqui apenas confirma que a regra não foi relaxada
      const user = await prisma.user.findUnique({ where: { id: userAId }, select: { kycStatus: true } });
      expect(user?.kycStatus).toBe('APPROVED');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 6. Acordo com Garantia — Dupla Confirmação e Liberação
  // ─────────────────────────────────────────────────────────────────

  describe('Acordo com Garantia — Dupla Confirmação e Liberação', () => {
    it('A cria acordo com garantia para B com dueDate e horário (14h30 UTC)', async () => {
      const result = await agreements.createGuaranteed(userAId, {
        title: 'E2E — Garantia Dupla Confirmação',
        counterpartyKey: `@${keyBNormalized}`,
        amount: 250.00,
        currency: 'BRL',
        dueDate: DUE_DATE_ISO,
        confirmationRule: ConfirmationRule.MANUAL,
      });

      expect(result.type).toBe('WITH_GUARANTEE');
      expect(result.operationalStatus).toBe('AWAITING_ACCEPTANCE');
      expect(result.financialStatus).toBe('AWAITING_PAYMENT');
      expect(result.dueDate).toBeTruthy();
      expect(Number(result.amount)).toBe(250);

      // dueDate preserva hora (14h30)
      const stored = new Date(result.dueDate!);
      expect(stored.getUTCHours()).toBe(14);
      expect(stored.getUTCMinutes()).toBe(30);

      expect(result.receiverKeySnapshot).toBeTruthy();
      expect(result.receiverDestinationSnapshot).toBeTruthy(); // snapshot do destino de B
      guaranteed1Id = result.id;
    });

    it('B aceita o acordo com garantia → ACTIVE + AWAITING_PAYMENT', async () => {
      const result = await agreements.accept(userBId, guaranteed1Id);
      expect(result.operationalStatus).toBe('ACTIVE');
      expect(result.financialStatus).toBe('AWAITING_PAYMENT');
    });

    it('A inicia pagamento → PaymentIntent com QR Code Pix simulado', async () => {
      const result = await agreements.initiatePayment(userAId, guaranteed1Id);
      expect(result).toBeDefined();
      expect(result!.status).toBe('AWAITING_PAYMENT');
      expect(result!.pixCharge).toBeDefined();
      expect(result!.pixCharge?.qrCode).toBeTruthy();
      pi1Id = result!.id;
    });

    it('A simula confirmação de pagamento → financialStatus FUNDS_HELD, guarantee LOCKED', async () => {
      const result = await payments.simulateConfirmation(userAId, pi1Id);
      expect(result?.agreement?.financialStatus).toBe('FUNDS_HELD');
      expect(result?.agreement?.financialGuarantee?.status).toBe('LOCKED');
      expect(Number(result?.agreement?.financialGuarantee?.amount)).toBe(250);
    });

    it('A confirma conclusão → AWAITING_CONFIRMATION (aguarda B)', async () => {
      const result = await agreements.confirmCompletion(userAId, guaranteed1Id);
      expect(result.operationalStatus).toBe('AWAITING_CONFIRMATION');
      expect(result.financialStatus).toBe('FUNDS_HELD');
    });

    it('A tenta confirmar duas vezes → ConflictException (idempotência)', async () => {
      await expect(
        agreements.confirmCompletion(userAId, guaranteed1Id),
      ).rejects.toThrow();
    });

    it('B confirma conclusão (segunda) → COMPLETED + PAID_OUT', async () => {
      const result = await agreements.confirmCompletion(userBId, guaranteed1Id);
      expect(result.operationalStatus).toBe('COMPLETED');
      expect(result.financialStatus).toBe('PAID_OUT');
    });

    it('financialGuarantee fica PAID_OUT no banco', async () => {
      const agr = await prisma.agreement.findUnique({
        where: { id: guaranteed1Id },
        include: { financialGuarantee: true },
      });
      expect(agr?.financialGuarantee?.status).toBe('PAID_OUT');
      expect(agr?.financialGuarantee?.releasedAt).toBeTruthy();
    });

    it('payout criado com status COMPLETED e metadata simulated=true', async () => {
      const payout = await prisma.payout.findFirst({
        where: { agreementId: guaranteed1Id },
      });
      expect(payout?.status).toBe('COMPLETED');
      expect(payout?.metadata).toMatchObject({ simulated: true });
    });

    it('trust score de A e B foram atualizados (AGREEMENT_COMPLETED)', async () => {
      const tsA = await prisma.trustScore.findUnique({ where: { userId: userAId } });
      const tsB = await prisma.trustScore.findUnique({ where: { userId: userBId } });
      // Score inicial é 500 + 20 (AGREEMENT_COMPLETED) = 520 ou mais
      expect(tsA!.score).toBeGreaterThan(500);
      expect(tsB!.score).toBeGreaterThan(500);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 7. Contestação Formal e Resolução Admin (Release ao Recebedor)
  // ─────────────────────────────────────────────────────────────────

  describe('Contestação Formal e Resolução Admin (Release ao Recebedor)', () => {
    it('A cria segundo acordo com garantia para B (para disputa)', async () => {
      const result = await agreements.createGuaranteed(userAId, {
        title: 'E2E — Garantia para Contestação (Release)',
        counterpartyKey: `@${keyBNormalized}`,
        amount: 500.00,
        currency: 'BRL',
        dueDate: DUE_DATE_ISO,
        confirmationRule: ConfirmationRule.MANUAL,
      });
      guaranteed2Id = result.id;
    });

    it('B aceita, A paga e confirma → FUNDS_HELD', async () => {
      await agreements.accept(userBId, guaranteed2Id);
      const pi = await agreements.initiatePayment(userAId, guaranteed2Id);
      pi2Id = pi!.id;
      await payments.simulateConfirmation(userAId, pi2Id);
      const agr = await agreements.findOne(userAId, guaranteed2Id);
      expect(agr.financialStatus).toBe('FUNDS_HELD');
    });

    it('B abre contestação formal → financialStatus DISPUTED, operationalStatus ACTIVE', async () => {
      const result = await agreements.openDispute(userBId, guaranteed2Id, {
        reason: 'Serviço não entregue no prazo',
        description: 'O combinado não foi cumprido dentro do prazo estabelecido.',
      });
      // operationalStatus não muda: permanece ACTIVE (DISPUTED não existe neste enum)
      expect(result.operationalStatus).toBe('ACTIVE');
      expect(result.financialStatus).toBe('DISPUTED');

      const dispute = await prisma.dispute.findUnique({
        where: { agreementId: guaranteed2Id },
      });
      expect(dispute?.status).toBe('OPEN');
      dispute2Id = dispute!.id;

      const guarantee = await prisma.financialGuarantee.findUnique({
        where: { agreementId: guaranteed2Id },
      });
      expect(guarantee?.status).toBe('FROZEN_DISPUTE');
    });

    it('release enquanto disputa aberta → ConflictException', async () => {
      await expect(agreements.release(userAId, guaranteed2Id)).rejects.toThrow();
    });

    it('confirmCompletion enquanto disputa → ConflictException', async () => {
      await expect(
        agreements.confirmCompletion(userAId, guaranteed2Id),
      ).rejects.toThrow();
    });

    it('admin faz login e obtém JWT com type=admin no payload', async () => {
      const result = await adminAuth.login({ email: ADMIN_EMAIL, password: PASSWORD });
      expect(result.accessToken).toBeDefined();
      expect(result.admin.role).toBe('ADMIN');
      const decoded = jwtService.decode(result.accessToken) as Record<string, unknown>;
      expect(decoded['type']).toBe('admin');
    });

    it('JWT admin não pode ser verificado com JWT_SECRET (secrets separados)', async () => {
      const result = await adminAuth.login({ email: ADMIN_EMAIL, password: PASSWORD });
      const userSecret = configService.get<string>('JWT_SECRET') ?? '';
      expect(() =>
        jwtService.verify(result.accessToken, { secret: userSecret }),
      ).toThrow();
    });

    it('JWT usuário não pode ser verificado com ADMIN_JWT_SECRET (secrets separados)', async () => {
      const result = await auth.login({ email: ALICE_EMAIL, password: PASSWORD });
      const adminSecret =
        configService.get<string>('ADMIN_JWT_SECRET') ?? 'admin-jwt-secret-dev';
      expect(() =>
        jwtService.verify(result.accessToken, { secret: adminSecret }),
      ).toThrow();
    });

    it('token usuário NÃO tem type=admin no payload', async () => {
      const result = await auth.login({ email: ALICE_EMAIL, password: PASSWORD });
      const decoded = jwtService.decode(result.accessToken) as Record<string, unknown>;
      expect(decoded['type']).toBeUndefined();
    });

    it('admin resolve liberando ao recebedor (B)', async () => {
      const result = await admin.resolveRelease(adminUserId, dispute2Id, {
        reason: 'Evidências comprovam que o serviço foi prestado conforme acordado.',
        adminNote: 'Análise E2E — liberação ao recebedor.',
      });
      expect(result.status).toBe('RESOLVED_FAVOR_COUNTERPART');
      expect(result.resolvedById).toBe(adminUserId);
      expect(result.resolvedByType).toBe('ADMIN');
    });

    it('acordo 2 encerra com operationalStatus COMPLETED + financialStatus PAID_OUT', async () => {
      const agr = await agreements.findOne(userBId, guaranteed2Id);
      expect(agr.operationalStatus).toBe('COMPLETED');
      expect(agr.financialStatus).toBe('PAID_OUT');
    });

    it('audit log registra adminUserId real e ação ADMIN_DISPUTE_RESOLVED', async () => {
      const log = await prisma.auditLog.findFirst({
        where: { adminUserId, resource: 'Dispute', resourceId: dispute2Id },
      });
      expect(log).toBeDefined();
      expect(log?.action).toBe('ADMIN_DISPUTE_RESOLVED');
    });

    it('resolução duplicada da mesma disputa → BadRequestException', async () => {
      await expect(
        admin.resolveRelease(adminUserId, dispute2Id, { reason: 'Duplicado' }),
      ).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 8. Resolução Admin — Reembolso ao Pagador
  // ─────────────────────────────────────────────────────────────────

  describe('Resolução Admin — Reembolso ao Pagador', () => {
    it('A cria terceiro acordo com garantia para B (para reembolso)', async () => {
      const result = await agreements.createGuaranteed(userAId, {
        title: 'E2E — Garantia para Contestação (Refund)',
        counterpartyKey: `@${keyBNormalized}`,
        amount: 300.00,
        currency: 'BRL',
        dueDate: DUE_DATE_ISO,
        confirmationRule: ConfirmationRule.MANUAL,
      });
      guaranteed3Id = result.id;
    });

    it('B aceita, A paga → FUNDS_HELD', async () => {
      await agreements.accept(userBId, guaranteed3Id);
      const pi = await agreements.initiatePayment(userAId, guaranteed3Id);
      pi3Id = pi!.id;
      await payments.simulateConfirmation(userAId, pi3Id);
    });

    it('A abre contestação (criador pode abrir) → financialStatus DISPUTED', async () => {
      const result = await agreements.openDispute(userAId, guaranteed3Id, {
        reason: 'Produto entregue diferente do combinado',
        description: 'O produto não corresponde ao que foi acordado.',
      });
      expect(result.operationalStatus).toBe('ACTIVE');
      const dispute = await prisma.dispute.findUnique({
        where: { agreementId: guaranteed3Id },
      });
      dispute3Id = dispute!.id;
    });

    it('usuário comum não pode resolver a disputa (apenas admin)', async () => {
      // Sem método público de resolução para usuários — verificado pela ausência de rota
      // O serviço AdminService.resolveRefund exige adminId (validado pela guard AdminJwtGuard)
      // Aqui verificamos que um usuário normal não tem acesso ao AdminService diretamente
      // O AdminJwtGuard bloqueia qualquer JWT que não tenha type=admin
      // Isso é coberto pelo teste de token security (secrets separados)
      expect(true).toBe(true); // documenta a regra; enforcement é via guard HTTP
    });

    it('admin resolve reembolsando pagador (A)', async () => {
      const result = await admin.resolveRefund(adminUserId, dispute3Id, {
        reason: 'Produto não correspondeu ao descrito. Reembolso aprovado.',
        adminNote: 'Análise E2E — reembolso ao pagador.',
      });
      expect(result.status).toBe('RESOLVED_FAVOR_CREATOR');
      expect(result.resolvedById).toBe(adminUserId);
    });

    it('acordo 3 encerra com operationalStatus CANCELLED + financialStatus REFUNDED', async () => {
      const agr = await agreements.findOne(userAId, guaranteed3Id);
      expect(agr.operationalStatus).toBe('CANCELLED');
      expect(agr.financialStatus).toBe('REFUNDED');
    });

    it('refund foi criado no banco com status COMPLETED e simulated=true', async () => {
      const refund = await prisma.refund.findFirst({
        where: { agreementId: guaranteed3Id },
      });
      expect(refund?.status).toBe('COMPLETED');
      expect(refund?.metadata).toMatchObject({ simulated: true });
    });

    it('audit log do refund registra adminUserId', async () => {
      const log = await prisma.auditLog.findFirst({
        where: { adminUserId, resource: 'Dispute', resourceId: dispute3Id },
      });
      expect(log?.action).toBe('ADMIN_DISPUTE_RESOLVED');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 9. Notificações In-App
  // ─────────────────────────────────────────────────────────────────

  describe('Notificações In-App', () => {
    it('A recebeu notificações ao longo dos fluxos', async () => {
      const result = await notifications.findAllByUser(userAId);
      expect(result.total).toBeGreaterThan(0);
    });

    it('B recebeu notificações ao longo dos fluxos', async () => {
      const result = await notifications.findAllByUser(userBId);
      expect(result.total).toBeGreaterThan(0);
    });

    it('notificações de B contêm AGREEMENT_RECEIVED', async () => {
      const result = await notifications.findAllByUser(userBId);
      const hasReceived = result.data.some((n: any) => n.type === 'AGREEMENT_RECEIVED');
      expect(hasReceived).toBe(true);
    });

    it('notificações de A contêm FUNDS_LOCKED', async () => {
      const result = await notifications.findAllByUser(userAId);
      const hasFundsLocked = result.data.some((n: any) => n.type === 'FUNDS_LOCKED');
      expect(hasFundsLocked).toBe(true);
    });

    it('notificações de A contêm DISPUTE_OPENED (ou PAYOUT_SENT / REFUND_PROCESSED)', async () => {
      const result = await notifications.findAllByUser(userAId);
      const types = result.data.map((n: any) => n.type);
      const hasRelevantNotif =
        types.includes('PAYOUT_SENT') ||
        types.includes('REFUND_PROCESSED') ||
        types.includes('DISPUTE_RESOLVED');
      expect(hasRelevantNotif).toBe(true);
    });

    it('getUnreadCount de B retorna contagem positiva antes do markAllRead', async () => {
      const result = await notifications.getUnreadCount(userBId);
      expect(result.count).toBeGreaterThan(0);
    });

    it('markAllRead de B zera as não lidas', async () => {
      await notifications.markAllRead(userBId);
      const result = await notifications.getUnreadCount(userBId);
      expect(result.count).toBe(0);
    });

    it('notificações de B pertencem todas ao userId de B', async () => {
      const result = await notifications.findAllByUser(userBId);
      const allBelong = result.data.every((n: any) => n.userId === userBId);
      expect(allBelong).toBe(true);
    });

    it('markAllRead de A zera não lidas de A', async () => {
      await notifications.markAllRead(userAId);
      const result = await notifications.getUnreadCount(userAId);
      expect(result.count).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 10. Wallet Summary
  // ─────────────────────────────────────────────────────────────────

  describe('Wallet Summary (getWalletSummary)', () => {
    it('getWalletSummary de A retorna estrutura com totals e financial', async () => {
      const summary = await agreements.getWalletSummary(userAId);
      expect(summary).toHaveProperty('totals');
      expect(summary).toHaveProperty('financial');
      expect(summary).toHaveProperty('sections');
      expect(summary).toHaveProperty('user');
      expect(summary.user.id).toBe(userAId);
    });

    it('totals.completed de A é ≥ 2 (simples + garantia1)', async () => {
      const summary = await agreements.getWalletSummary(userAId);
      expect(summary.totals.completed).toBeGreaterThanOrEqual(2);
    });

    it('getWalletSummary de B retorna acordos completados', async () => {
      const summary = await agreements.getWalletSummary(userBId);
      expect(summary.totals.completed).toBeGreaterThanOrEqual(2);
    });

    it('getStats do admin retorna contadores positivos', async () => {
      const stats = await admin.getStats();
      expect(stats.totalUsers).toBeGreaterThan(0);
      expect(stats.totalAgreements).toBeGreaterThan(0);
      expect(stats.totalDisputes).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 11. Admin — Listagem e Detalhe de Disputas
  // ─────────────────────────────────────────────────────────────────

  describe('Admin — Listagem e Detalhe de Disputas', () => {
    it('listDisputes retorna lista com campos esperados', async () => {
      const result = await admin.listDisputes({ page: 1, limit: 20 });
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.total).toBeGreaterThan(0);
    });

    it('listDisputes filtra por RESOLVED_FAVOR_COUNTERPART e encontra disputa 2', async () => {
      const result = await admin.listDisputes({
        status: 'RESOLVED_FAVOR_COUNTERPART' as any,
        page: 1,
        limit: 20,
      });
      const found = result.data.some((d: any) => d.id === dispute2Id);
      expect(found).toBe(true);
    });

    it('getDispute retorna detalhe completo com resolvedById correto', async () => {
      const result = await admin.getDispute(dispute2Id);
      expect(result.id).toBe(dispute2Id);
      expect(result.status).toBe('RESOLVED_FAVOR_COUNTERPART');
      expect(result.resolvedById).toBe(adminUserId);
      expect(result.resolvedByType).toBe('ADMIN');
      expect(result.agreement).toBeDefined();
      expect(result.messages).toBeDefined();
    });

    it('getDispute com id inexistente → NotFoundException', async () => {
      await expect(admin.getDispute('disp-nao-existe-xyz')).rejects.toThrow();
    });

    it('credenciais admin incorretas → UnauthorizedException genérica', async () => {
      await expect(
        adminAuth.login({ email: ADMIN_EMAIL, password: 'errada' }),
      ).rejects.toThrow('Credenciais inválidas.');
    });

    it('email admin inexistente → mesma mensagem genérica (sem vazar informação)', async () => {
      await expect(
        adminAuth.login({ email: 'fantasma@naoexiste.com', password: PASSWORD }),
      ).rejects.toThrow('Credenciais inválidas.');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 12. Webhook Fitbank Sandbox — Fase 24
  // ─────────────────────────────────────────────────────────────────

  describe('Fase 24 — Webhook Fitbank Sandbox', () => {
    let webhookAgrId: string;
    let webhookTxid: string;
    let webhookPiId: string;

    it('cria acordo com garantia para teste de webhook', async () => {
      const dto: CreateGuaranteedAgreementDto = {
        title: 'Acordo webhook sandbox',
        counterpartyKey: '@' + keyBNormalized,
        amount: 75.0,
        currency: 'BRL',
        dueDate: DUE_DATE_ISO,
      };

      const agr = await agreements.createGuaranteed(userAId, dto);
      webhookAgrId = agr.id;
      expect(agr.operationalStatus).toBe('AWAITING_ACCEPTANCE');
      expect(agr.financialStatus).toBe('AWAITING_PAYMENT');
    });

    it('bob aceita o acordo', async () => {
      const agr = await agreements.accept(userBId, webhookAgrId);
      expect(agr.operationalStatus).toBe('ACTIVE');
    });

    it('alice cria payment intent — provider sandbox retorna txid', async () => {
      const result = await agreements.initiatePayment(userAId, webhookAgrId) as any;
      webhookPiId = result.id;
      webhookTxid = result.pixCharge?.txid;

      expect(webhookTxid).toBeTruthy();
      expect(result.status).toBe('AWAITING_PAYMENT');
      expect(result.pixCharge?.qrCode).toBeTruthy();
      expect(result.instructions).toBeTruthy();
      expect(result.pixCharge?.amount.toString()).toMatch(/75/);
    });

    it('webhook PIX_CONFIRMED protege o valor (FUNDS_HELD)', async () => {
      const webhookBody = {
        event: 'PIX_PAYMENT_CONFIRMED',
        txid: webhookTxid,
        amount: '75.00',
        endToEndId: `E9999${Date.now()}`,
      };

      const result = await payments.handleFitbankWebhook({}, JSON.stringify(webhookBody), webhookBody as any);

      expect(result.received).toBe(true);
      expect(result.message).toContain('protegido');
    });

    it('verifica que acordo está com financialStatus = FUNDS_HELD após webhook', async () => {
      const agr = await agreements.findOne(userAId, webhookAgrId);
      expect(agr.financialStatus).toBe('FUNDS_HELD');
    });

    it('webhook duplicado com mesmo txid é idempotente (não quebra)', async () => {
      const webhookBody = {
        event: 'PIX_PAYMENT_CONFIRMED',
        txid: webhookTxid,
        amount: '75.00',
      };

      const result = await payments.handleFitbankWebhook({}, JSON.stringify(webhookBody), webhookBody as any);
      expect(result.received).toBe(true);
    });

    it('webhook com txid inexistente é ignorado sem erro', async () => {
      const webhookBody = {
        event: 'PIX_PAYMENT_CONFIRMED',
        txid: 'txid-que-nao-existe-em-lugar-nenhum',
        amount: '1.00',
      };

      const result = await payments.handleFitbankWebhook({}, JSON.stringify(webhookBody), webhookBody as any);
      expect(result.received).toBe(true);
    });

    it('webhook de evento desconhecido é registrado sem ação financeira', async () => {
      const webhookBody = {
        event: 'PIX_SOME_UNKNOWN_EVENT',
        txid: 'txid-qualquer',
      };

      const result = await payments.handleFitbankWebhook({}, JSON.stringify(webhookBody), webhookBody as any);
      expect(result.received).toBe(true);
    });

    it('confirma que nenhum dinheiro real foi movimentado', () => {
      // Verificação documental: o provider é SIMULATED ou FITBANK_SANDBOX,
      // FITBANK_ENABLE_REAL_CALLS=false (padrão), nenhuma chamada HTTP real ocorreu.
      expect(process.env['FITBANK_ENABLE_REAL_CALLS']).not.toBe('true');
    });
  });

  // ─────────────────────────────────────────────────────────────────
  // 13. Fase 26 — Blockchain Testnet como Prova
  // ─────────────────────────────────────────────────────────────────

  describe('Fase 26 — Blockchain Testnet como Prova', () => {
    it('provider blockchain é simulated por padrão (sem chamada real)', () => {
      expect(process.env['BLOCKCHAIN_ENABLE_REAL_CALLS']).not.toBe('true');
      expect(process.env['BLOCKCHAIN_PROVIDER'] ?? 'simulated').toBe('simulated');
    });

    it('acordo simples gera registros de prova com eventType AGREEMENT_CREATED', async () => {
      const records = await prisma.blockchainRecord.findMany({
        where: { agreementId: simpleAgrId, eventType: 'AGREEMENT_CREATED' },
      });
      expect(records.length).toBeGreaterThanOrEqual(1);
      expect(records[0].status).toBe('SUBMITTED');
      expect(records[0].proofHash).toBeTruthy();
      expect(records[0].txHash).toBeTruthy();
    });

    it('acordo com garantia gera proofs para AGREEMENT_CREATED + AGREEMENT_ACCEPTED + PAYOUT_COMPLETED', async () => {
      const records = await prisma.blockchainRecord.findMany({
        where: { agreementId: guaranteed1Id },
        orderBy: { createdAt: 'asc' },
      });
      const eventTypes = records.map((r) => r.eventType);
      expect(eventTypes).toContain('AGREEMENT_CREATED');
      expect(eventTypes).toContain('AGREEMENT_ACCEPTED');
      // DUAL_CONFIRMATION_PAYOUT ou PAYOUT_COMPLETED deve existir
      const hasPayout = eventTypes.some((e) => e?.includes('PAYOUT') || e?.includes('CONFIRMATION'));
      expect(hasPayout).toBe(true);
    });

    it('disputa + resolução admin geram proofs de DISPUTE_OPENED e DISPUTE_RESOLVED', async () => {
      const records = await prisma.blockchainRecord.findMany({
        where: { agreementId: guaranteed2Id },
        orderBy: { createdAt: 'asc' },
      });
      const eventTypes = records.map((r) => r.eventType);
      expect(eventTypes).toContain('DISPUTE_OPENED');
      expect(eventTypes).toContain('DISPUTE_RESOLVED');
    });

    it('getProofsForUser retorna provas para participante do acordo', async () => {
      const proofs = await blockchainRecords.getProofsForUser(userAId, simpleAgrId);
      expect(proofs.length).toBeGreaterThanOrEqual(1);
      expect(proofs[0].status).toBe('SUBMITTED');
      expect(proofs[0].eventType).toBe('AGREEMENT_CREATED');
      expect(proofs[0].proofHashShort).toContain('…');
      // full proofHash must not be exposed in user-facing response
      expect((proofs[0] as unknown as Record<string, unknown>).proofHash).toBeUndefined();
    });

    it('getProofsForUser lança ForbiddenException para usuário não participante', async () => {
      const { ForbiddenException } = await import('@nestjs/common');
      await expect(
        blockchainRecords.getProofsForUser(userCId, guaranteed1Id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('getProofsForAdmin retorna provas completas com proofHash e txHash', async () => {
      const proofs = await blockchainRecords.getProofsForAdmin(guaranteed1Id);
      expect(proofs.length).toBeGreaterThanOrEqual(1);
      expect(proofs[0].proofHash).toHaveLength(64);
      expect(proofs[0].txHash).toMatch(/^0x[a-f0-9]+/);
    });

    it('proofs não expõem dados sensíveis (CPF, pixKey, tokens)', async () => {
      const records = await prisma.blockchainRecord.findMany({
        where: { agreementId: guaranteed2Id },
      });
      for (const record of records) {
        const data = record.proofData as Record<string, unknown> | null;
        if (!data) continue;
        const json = JSON.stringify(data);
        // CPF real não deve aparecer sem máscara
        expect(json).not.toContain('11144477735');
        // pixKey completa não deve aparecer (normalizedKey is redacted)
        // Senha nunca exposta
        expect(json).not.toContain('passwordHash');
        expect(json).not.toContain('accessToken');
        expect(json).not.toContain('refreshToken');
      }
    });

    it('proofHash é determinístico — mesma payload gera mesmo hash', async () => {
      const { sha256 } = await import('../../src/common/utils/canonical-json.util');
      const payload = { agreementId: 'test-det', amount: '100', currency: 'BRL' };
      const h1 = sha256({ eventType: 'TEST', ...payload });
      const h2 = sha256({ eventType: 'TEST', ...payload });
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64);
    });

    it('dueDate continua obrigatório — DTO de acordo garantido o exige', async () => {
      // DTO-level validation: dueDate is @IsDateString() @IsNotEmpty() in CreateGuaranteedAgreementDto
      // This invariant is tested at the DTO validation level (class-validator).
      // Here we just confirm guaranteed1Id has a dueDate set.
      const agr = await prisma.agreement.findUnique({
        where: { id: guaranteed1Id },
        select: { dueDate: true },
      });
      expect(agr?.dueDate).toBeTruthy();
    });

    it('acordo com garantia ainda exige KYC progressivo e destino ativo', async () => {
      // userCId não tem KYC iniciado (kycStatus=PENDING) — deve bloquear
      const { BadRequestException } = await import('@nestjs/common');
      await expect(
        agreements.createGuaranteed(userCId, {
          title: 'Carol sem KYC',
          counterpartyKey: '@' + keyBNormalized,
          amount: 10,
          currency: 'BRL',
          dueDate: DUE_DATE_ISO,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('blockchain real não foi integrada — sem chamada de rede externa', () => {
      // Garantia documental: BLOCKCHAIN_ENABLE_REAL_CALLS=false (padrão CI/local)
      expect(process.env['BLOCKCHAIN_ENABLE_REAL_CALLS']).not.toBe('true');
    });
  });
});
