import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, makeUser, makeSession } from '../../test/helpers/factories';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const FAKE_TOKEN = 'fake.jwt.token';
  const FAKE_REFRESH = 'fake.refresh.token';

  beforeEach(async () => {
    prisma = createPrismaMock();

    jwtService = {
      sign: jest.fn().mockReturnValue(FAKE_TOKEN),
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn((key: string, defaultVal?: unknown) => {
        const map: Record<string, unknown> = {
          JWT_SECRET: 'test-secret',
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_SECRET: 'test-refresh-secret',
          JWT_REFRESH_EXPIRES_IN: '7d',
          ADMIN_TOKEN: 'test-admin-token',
        };
        return map[key] ?? defaultVal;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  // ── register ─────────────────────────────────────────────────

  describe('register', () => {
    const dto = { email: 'alice@test.com', password: 'senha123', firstName: 'Alice', lastName: 'Test' };

    it('cria usuário, perfil, score e retorna tokens', async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(user);
      prisma.deviceSession.create.mockResolvedValue(makeSession());

      const result = await service.register(dto);

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(prisma.deviceSession.create).toHaveBeenCalledTimes(1);
      expect(result.accessToken).toBe(FAKE_TOKEN);
      expect(result.user.email).toBe('alice@test.com');
    });

    it('normaliza email para lowercase', async () => {
      const user = makeUser({ email: 'alice@test.com' });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(user);
      prisma.deviceSession.create.mockResolvedValue(makeSession());

      await service.register({ ...dto, email: 'ALICE@TEST.COM' });

      const createCall = prisma.user.create.mock.calls[0][0];
      expect(createCall.data.email).toBe('alice@test.com');
    });

    it('lança ConflictException quando email já está em uso', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  // ── login ─────────────────────────────────────────────────────

  describe('login', () => {
    it('retorna tokens com credenciais válidas', async () => {
      const hash = await bcrypt.hash('senha123', 1);
      const user = makeUser({ passwordHash: hash });
      prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash: hash });
      prisma.deviceSession.create.mockResolvedValue(makeSession());

      const result = await service.login({ email: 'alice@test.com', password: 'senha123' });

      expect(result.accessToken).toBe(FAKE_TOKEN);
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('lança UnauthorizedException para usuário inexistente', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@test.com', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException para senha incorreta', async () => {
      const hash = await bcrypt.hash('correta', 1);
      prisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash: hash }));

      await expect(
        service.login({ email: 'alice@test.com', password: 'errada' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException para conta inativa', async () => {
      const hash = await bcrypt.hash('senha123', 1);
      prisma.user.findUnique.mockResolvedValue(makeUser({ status: 'BLOCKED', passwordHash: hash }));

      await expect(
        service.login({ email: 'alice@test.com', password: 'senha123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('nunca retorna passwordHash na resposta', async () => {
      const hash = await bcrypt.hash('senha123', 1);
      prisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash: hash }));
      prisma.deviceSession.create.mockResolvedValue(makeSession());

      const result = await service.login({ email: 'alice@test.com', password: 'senha123' });
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  // ── refresh ───────────────────────────────────────────────────

  describe('refresh', () => {
    it('retorna novo accessToken com refresh token válido', async () => {
      const session = makeSession();
      jwtService.verify.mockReturnValue({ sub: 'user-a', email: 'alice@test.com', sid: session.id });
      prisma.deviceSession.findUnique.mockResolvedValue(session);

      const result = await service.refresh(session.refreshToken);

      expect(result.accessToken).toBe(FAKE_TOKEN);
    });

    it('lança UnauthorizedException para token inválido', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('invalid'); });

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException para sessão revogada', async () => {
      const session = makeSession({ revokedAt: new Date() });
      jwtService.verify.mockReturnValue({ sub: 'user-a', email: 'alice@test.com', sid: session.id });
      prisma.deviceSession.findUnique.mockResolvedValue(session);

      await expect(service.refresh('any-token')).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException para sessão expirada', async () => {
      const session = makeSession({ expiresAt: new Date(Date.now() - 1000) });
      jwtService.verify.mockReturnValue({ sub: 'user-a', email: 'alice@test.com', sid: session.id });
      prisma.deviceSession.findUnique.mockResolvedValue(session);

      await expect(service.refresh('any-token')).rejects.toThrow(UnauthorizedException);
    });

    it('revoga sessão e lança erro ao detectar token reutilizado', async () => {
      const session = makeSession({ refreshToken: 'correct-token' });
      jwtService.verify.mockReturnValue({ sub: 'user-a', email: 'alice@test.com', sid: session.id });
      prisma.deviceSession.findUnique.mockResolvedValue(session);
      prisma.deviceSession.update.mockResolvedValue(session);

      await expect(service.refresh('different-token')).rejects.toThrow(UnauthorizedException);
      expect(prisma.deviceSession.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revokedAt: expect.any(Date) } }),
      );
    });

    it('lança UnauthorizedException quando sessão não encontrada', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-a', email: 'alice@test.com', sid: 'sess-x' });
      prisma.deviceSession.findUnique.mockResolvedValue(null);

      await expect(service.refresh('any-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ────────────────────────────────────────────────────

  describe('logout', () => {
    it('revoga a sessão pelo sessionId', async () => {
      prisma.deviceSession.update.mockResolvedValue({});

      await service.logout('session-001');

      expect(prisma.deviceSession.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'session-001' }, data: { revokedAt: expect.any(Date) } }),
      );
    });

    it('não lança erro quando sessionId é undefined', async () => {
      await expect(service.logout(undefined)).resolves.toBeUndefined();
      expect(prisma.deviceSession.update).not.toHaveBeenCalled();
    });
  });

  // ── getMe ─────────────────────────────────────────────────────

  describe('getMe', () => {
    it('retorna o usuário autenticado com perfil e score', async () => {
      const user = makeUser();
      prisma.user.findUnique.mockResolvedValue(user);

      const result = await service.getMe('user-a');
      expect(result.email).toBe('alice@test.com');
    });

    it('lança NotFoundException para userId inexistente', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('ghost')).rejects.toThrow(NotFoundException);
    });
  });
});
