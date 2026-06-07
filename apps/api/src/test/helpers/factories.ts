/**
 * Test factories — shared helpers for unit tests.
 * Returns plain objects that replicate Prisma model shapes.
 * All monetary amounts are Prisma.Decimal-like (string-serializable).
 */

export const TEST_ADMIN_TOKEN = 'test-admin-token-dev-123';

// ── User ───────────────────────────────────────────────────────

type UserOverrides = {
  id?: string;
  email?: string;
  passwordHash?: string;
  status?: 'ACTIVE' | 'BLOCKED' | 'PENDING';
  kycStatus?: 'NONE' | 'PENDING' | 'VERIFIED';
  emailVerifiedAt?: Date | null;
  phoneVerifiedAt?: Date | null;
  phone?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  profile?: ReturnType<typeof makeProfile>;
  trustScore?: { score: number; level: string };
};

export function makeUser(overrides: UserOverrides = {}) {
  return {
    id: 'user-a',
    email: 'alice@test.com',
    passwordHash: '$2b$12$hashed',
    status: 'ACTIVE' as const,
    kycStatus: 'NONE' as const,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    phone: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    profile: makeProfile(),
    trustScore: { score: 500, level: 'MEDIUM' },
    ...overrides,
  };
}

export function makeProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'profile-a',
    fullName: 'Alice Test',
    displayName: 'Alice',
    avatarUrl: null,
    bio: null,
    city: null,
    state: null,
    country: null,
    birthDate: null,
    ...overrides,
  };
}

export function makeUserB() {
  return makeUser({
    id: 'user-b',
    email: 'bob@test.com',
    profile: makeProfile({ id: 'profile-b', fullName: 'Bob Test', displayName: 'Bob' }),
  });
}

// ── DeviceSession ───────────────────────────────────────────────

export function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-001',
    userId: 'user-a',
    refreshToken: 'refresh-token-abc',
    ip: '127.0.0.1',
    userAgent: 'jest-test',
    revokedAt: null,
    expiresAt: new Date(Date.now() + 7 * 86_400_000),
    createdAt: new Date(),
    ...overrides,
  };
}

// ── ReceivingKey ────────────────────────────────────────────────

export function makeReceivingKey(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rk-001',
    userId: 'user-a',
    type: 'RANDOM' as const,
    key: '@alice',
    normalizedKey: 'alice',
    status: 'ACTIVE' as const,
    isDefault: true,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    user: {
      id: 'user-a',
      profile: makeProfile(),
    },
    ...overrides,
  };
}

export function makeReceivingKeyB() {
  return makeReceivingKey({
    id: 'rk-002',
    userId: 'user-b',
    key: '@bob',
    normalizedKey: 'bob',
    user: { id: 'user-b', profile: makeProfile({ id: 'profile-b', fullName: 'Bob Test', displayName: 'Bob' }) },
  });
}

// ── ReceivingDestination ────────────────────────────────────────

export function makeReceivingDestination(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rd-001',
    userId: 'user-b',
    type: 'PIX_EMAIL' as const,
    keyValue: 'bob@test.com',
    nickname: 'Minha chave email',
    status: 'ACTIVE' as const,
    isDefault: true,
    bankName: null,
    bankIspb: null,
    metadata: null,
    deletedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// ── Agreement ──────────────────────────────────────────────────

export function makeAgreement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'agr-001',
    type: 'SIMPLE' as const,
    mode: 'STANDARD' as const,
    operationalStatus: 'AWAITING_ACCEPTANCE' as const,
    financialStatus: 'NONE' as const,
    title: 'Test Agreement',
    description: 'A test agreement',
    generatedSummary: 'Alice criou um combinado com Bob.',
    contentHash: 'sha256-hash',
    amount: null,
    currency: 'BRL',
    dueDate: null,
    createdById: 'user-a',
    payerId: null,
    receiverId: 'user-b',
    acceptanceExpiresAt: null,
    confirmationDeadlineAt: null,
    completedAt: null,
    canceledAt: null,
    disputedAt: null,
    confirmationRule: 'SINGLE_PARTY' as const,
    releaseRule: 'MANUAL' as const,
    refundRule: 'MANUAL' as const,
    disputeRule: 'ALLOWED' as const,
    receiverKeySnapshot: { key: '@bob', normalizedKey: 'bob', userId: 'user-b' },
    receiverDestinationSnapshot: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    participants: [
      makeParticipant({ userId: 'user-a', role: 'CREATOR', status: 'ACCEPTED' }),
      makeParticipant({ userId: 'user-b', role: 'COUNTERPART', status: 'PENDING' }),
    ],
    financialGuarantee: null,
    dispute: null,
    ...overrides,
  };
}

export function makeGuaranteedAgreement(overrides: Record<string, unknown> = {}) {
  return makeAgreement({
    id: 'agr-002',
    type: 'WITH_GUARANTEE' as const,
    operationalStatus: 'ACTIVE' as const,
    financialStatus: 'FUNDS_HELD' as const,
    amount: { toNumber: () => 350, toString: () => '350.00' },
    payerId: 'user-a',
    receiverId: 'user-b',
    confirmationRule: 'MANUAL' as const,
    financialGuarantee: makeFinancialGuarantee(),
    ...overrides,
  });
}

export function makeParticipant(overrides: Record<string, unknown> = {}) {
  return {
    id: `part-${Math.random().toString(36).slice(2)}`,
    agreementId: 'agr-001',
    userId: 'user-a',
    role: 'CREATOR' as const,
    status: 'ACCEPTED' as const,
    acceptedAt: new Date('2026-01-01'),
    rejectedAt: null,
    ...overrides,
  };
}

// ── FinancialGuarantee ─────────────────────────────────────────

export function makeFinancialGuarantee(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fg-001',
    agreementId: 'agr-002',
    amount: { toNumber: () => 350, toString: () => '350.00' },
    currency: 'BRL',
    status: 'LOCKED' as const,
    lockedAt: new Date('2026-01-02'),
    releasedAt: null,
    revertedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    paymentIntents: [],
    payouts: [],
    refunds: [],
    ...overrides,
  };
}

// ── PaymentIntent ──────────────────────────────────────────────

export function makePaymentIntent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pi-001',
    agreementId: 'agr-002',
    financialGuaranteeId: 'fg-001',
    payerId: 'user-a',
    amount: { toNumber: () => 350 },
    currency: 'BRL',
    status: 'AWAITING_PAYMENT' as const,
    idempotencyKey: 'idem-001',
    expiresAt: new Date(Date.now() + 30 * 60_000),
    paidAt: null,
    metadata: { provider: 'SIMULATED', environment: 'dev' },
    pixCharge: null,
    agreement: makeGuaranteedAgreement(),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// ── Dispute ────────────────────────────────────────────────────

export function makeDispute(overrides: Record<string, unknown> = {}) {
  return {
    id: 'disp-001',
    agreementId: 'agr-002',
    openedById: 'user-b',
    reason: 'Serviço não entregue',
    description: 'O prazo venceu sem entrega.',
    status: 'OPEN' as const,
    resolution: null,
    resolvedById: null,
    resolvedByType: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date('2026-01-03'),
    updatedAt: new Date('2026-01-03'),
    messages: [],
    agreement: {
      participants: [
        { userId: 'user-a' },
        { userId: 'user-b' },
      ],
    },
    ...overrides,
  };
}

// ── Notification ───────────────────────────────────────────────

export function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 'notif-001',
    userId: 'user-a',
    type: 'AGREEMENT_RECEIVED' as const,
    title: 'Você recebeu um combinado',
    body: 'Alguém criou um combinado com você.',
    data: { agreementId: 'agr-001' },
    status: 'UNREAD' as const,
    readAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// ── TrustScore ─────────────────────────────────────────────────

export function makeTrustScore(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ts-001',
    userId: 'user-a',
    score: 500,
    level: 'MEDIUM' as const,
    completedAgreements: 0,
    canceledAgreements: 0,
    disputesOpened: 0,
    disputesWon: 0,
    disputesLost: 0,
    lastCalculatedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// ── Prisma Mock Factory ────────────────────────────────────────

/**
 * Creates a deep jest.fn() mock that mirrors the PrismaService shape.
 * Methods return undefined by default; override in each test with mockResolvedValue.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createPrismaMock() {
  const fn = (): jest.Mock => jest.fn();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mock: Record<string, any> = {
    user: { findUnique: fn(), findFirst: fn(), findMany: fn(), create: fn(), update: fn(), count: fn() },
    userProfile: { findUnique: fn(), update: fn(), upsert: fn() },
    deviceSession: { findUnique: fn(), create: fn(), update: fn() },
    receivingKey: {
      findUnique: fn(), findFirst: fn(), findMany: fn(), create: fn(), update: fn(),
    },
    receivingDestination: {
      findUnique: fn(), findFirst: fn(), findMany: fn(), create: fn(), update: fn(),
      updateMany: fn(), count: fn(),
    },
    agreement: {
      findUnique: fn(), findFirst: fn(), findMany: fn(), create: fn(), update: fn(), count: fn(),
    },
    agreementParticipant: { createMany: fn(), updateMany: fn(), findFirst: fn(), update: fn() },
    agreementEvent: {
      createMany: fn(), create: fn(), findMany: fn(), count: fn(), findFirst: fn(),
    },
    agreementStatusHistory: { create: fn() },
    financialGuarantee: { findUnique: fn(), findFirst: fn(), create: fn(), update: fn() },
    paymentIntent: {
      findUnique: fn(), findFirst: fn(), create: fn(), update: fn(), findMany: fn(),
    },
    pixCharge: { findUnique: fn(), findFirst: fn(), create: fn(), update: fn() },
    payout: { findFirst: fn(), create: fn(), update: fn() },
    refund: { findFirst: fn(), create: fn(), update: fn() },
    dispute: {
      findUnique: fn(), findFirst: fn(), findMany: fn(), create: fn(), update: fn(), count: fn(),
    },
    disputeMessage: { create: fn() },
    notification: {
      create: fn(), findUnique: fn(), findMany: fn(), update: fn(), updateMany: fn(), count: fn(),
    },
    financialProfile: { findUnique: fn(), findFirst: fn(), upsert: fn(), create: fn(), update: fn() },
    trustScore: { findUnique: fn(), update: fn() },
    trustScoreEvent: { create: fn() },
    auditLog: { create: fn() },
    blockchainRecord: { create: fn(), upsert: fn() },
    adminUser: { findUnique: fn(), update: fn() },
    $connect: fn(),
    $disconnect: fn(),
  };

  // $transaction: if arg is a function, call it with mock (tx); if array, resolve all
  mock.$transaction = jest.fn(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (arg: unknown): Promise<any> => {
      if (typeof arg === 'function') {
        return Promise.resolve((arg as (tx: unknown) => unknown)(mock));
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg as Promise<unknown>[]);
      }
      return Promise.resolve(arg);
    },
  );

  return mock as typeof mock;
}

// ── AdminUser ──────────────────────────────────────────────────

export function makeAdminUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'admin-001',
    email: 'admin@selo.app',
    name: 'Admin Selo',
    passwordHash: '$2b$12$hashed',
    role: 'ADMIN',
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  };
}
