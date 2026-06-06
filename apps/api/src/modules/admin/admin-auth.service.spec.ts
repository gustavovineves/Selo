import { Test } from '@nestjs/testing';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AdminAuthService } from './admin-auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, makeAdminUser } from '../../test/helpers/factories';

describe('AdminAuthService', () => {
  let service: AdminAuthService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let jwtService: { sign: jest.Mock };
  let config: { get: jest.Mock };

  const HASHED_PASSWORD = bcrypt.hashSync('Senha@123', 12);

  beforeEach(async () => {
    prisma = createPrismaMock();
    jwtService = { sign: jest.fn().mockReturnValue('mock-admin-jwt') };
    config = { get: jest.fn().mockReturnValue('1d') };

    const module = await Test.createTestingModule({
      providers: [
        AdminAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get(AdminAuthService);
  });

  // ── login ─────────────────────────────────────────────────────

  describe('login', () => {
    it('retorna accessToken e dados do admin com credenciais válidas', async () => {
      const admin = makeAdminUser({ passwordHash: HASHED_PASSWORD });
      prisma.adminUser.findUnique.mockResolvedValue(admin);
      prisma.adminUser.update.mockResolvedValue(admin);

      const result = await service.login({
        email: 'admin@selo.app',
        password: 'Senha@123',
      });

      expect(result.accessToken).toBe('mock-admin-jwt');
      expect(result.admin.id).toBe('admin-001');
      expect(result.admin.role).toBe('ADMIN');
      expect(result.admin).not.toHaveProperty('passwordHash');
    });

    it('assina JWT com payload type=admin', async () => {
      const admin = makeAdminUser({ passwordHash: HASHED_PASSWORD });
      prisma.adminUser.findUnique.mockResolvedValue(admin);
      prisma.adminUser.update.mockResolvedValue(admin);

      await service.login({ email: 'admin@selo.app', password: 'Senha@123' });

      const signCall = jwtService.sign.mock.calls[0][0];
      expect(signCall.type).toBe('admin');
      expect(signCall.sub).toBe('admin-001');
    });

    it('normaliza email para lowercase antes de buscar', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ADMIN@SELO.APP', password: 'qualquer' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(prisma.adminUser.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'admin@selo.app' } }),
      );
    });

    it('lança UnauthorizedException para admin inexistente', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@test.com', password: 'Senha@123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException para senha incorreta', async () => {
      const admin = makeAdminUser({ passwordHash: HASHED_PASSWORD });
      prisma.adminUser.findUnique.mockResolvedValue(admin);

      await expect(
        service.login({ email: 'admin@selo.app', password: 'senha-errada' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException para admin SUSPENDED (mensagem genérica)', async () => {
      const admin = makeAdminUser({ status: 'SUSPENDED', passwordHash: HASHED_PASSWORD });
      prisma.adminUser.findUnique.mockResolvedValue(admin);

      await expect(
        service.login({ email: 'admin@selo.app', password: 'Senha@123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança UnauthorizedException para admin DELETED (mensagem genérica)', async () => {
      const admin = makeAdminUser({ status: 'DELETED', passwordHash: HASHED_PASSWORD });
      prisma.adminUser.findUnique.mockResolvedValue(admin);

      await expect(
        service.login({ email: 'admin@selo.app', password: 'Senha@123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('atualiza lastLoginAt após login bem-sucedido', async () => {
      const admin = makeAdminUser({ passwordHash: HASHED_PASSWORD });
      prisma.adminUser.findUnique.mockResolvedValue(admin);
      prisma.adminUser.update.mockResolvedValue(admin);

      await service.login({ email: 'admin@selo.app', password: 'Senha@123' });

      expect(prisma.adminUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'admin-001' },
          data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
        }),
      );
    });

    it('erros de admin inexistente e senha errada têm a mesma mensagem genérica', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(null);
      let msgNotFound = '';
      try {
        await service.login({ email: 'ghost@test.com', password: 'x' });
      } catch (e) {
        msgNotFound = (e as UnauthorizedException).message;
      }

      const admin = makeAdminUser({ passwordHash: HASHED_PASSWORD });
      prisma.adminUser.findUnique.mockResolvedValue(admin);
      let msgWrongPass = '';
      try {
        await service.login({ email: 'admin@selo.app', password: 'errada' });
      } catch (e) {
        msgWrongPass = (e as UnauthorizedException).message;
      }

      expect(msgNotFound).toBe(msgWrongPass);
    });
  });

  // ── getMe ─────────────────────────────────────────────────────

  describe('getMe', () => {
    it('retorna dados do admin sem expor passwordHash', async () => {
      const admin = {
        id: 'admin-001',
        email: 'admin@selo.app',
        name: 'Admin Selo',
        role: 'ADMIN',
        status: 'ACTIVE',
        lastLoginAt: null,
        createdAt: new Date('2026-01-01'),
      };
      prisma.adminUser.findUnique.mockResolvedValue(admin);

      const result = await service.getMe('admin-001');

      expect(result.id).toBe('admin-001');
      expect(result.role).toBe('ADMIN');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('lança NotFoundException para admin inexistente', async () => {
      prisma.adminUser.findUnique.mockResolvedValue(null);

      await expect(service.getMe('ghost-id')).rejects.toThrow(NotFoundException);
    });

    it('retorna lastLoginAt quando preenchido', async () => {
      const lastLoginAt = new Date('2026-06-01T10:00:00Z');
      const admin = { id: 'admin-001', email: 'admin@selo.app', name: 'Admin', role: 'ADMIN', status: 'ACTIVE', lastLoginAt, createdAt: new Date() };
      prisma.adminUser.findUnique.mockResolvedValue(admin);

      const result = await service.getMe('admin-001');
      expect(result.lastLoginAt).toEqual(lastLoginAt);
    });
  });

  // ── logout ────────────────────────────────────────────────────

  describe('logout', () => {
    it('retorna mensagem de confirmação', () => {
      const result = service.logout();
      expect(result.message).toContain('Logout');
    });
  });
});
