import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, makeNotification } from '../../test/helpers/factories';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  const USER_ID = 'user-a';
  const OTHER_USER = 'user-x';

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  // ── send ──────────────────────────────────────────────────────

  describe('send', () => {
    it('cria notificação com os campos corretos', async () => {
      const notif = makeNotification();
      prisma.notification.create.mockResolvedValue(notif);

      const result = await service.send(
        USER_ID,
        'AGREEMENT_RECEIVED',
        'Você recebeu um combinado',
        'Alguém criou um combinado com você.',
        { agreementId: 'agr-001' },
      );

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: USER_ID,
            type: 'AGREEMENT_RECEIVED',
            title: 'Você recebeu um combinado',
          }),
        }),
      );
      expect(result.id).toBe('notif-001');
    });
  });

  // ── findAllByUser ─────────────────────────────────────────────

  describe('findAllByUser', () => {
    it('retorna notificações paginadas do usuário', async () => {
      const notifs = [makeNotification(), makeNotification({ id: 'notif-002', status: 'READ' })];
      prisma.notification.findMany.mockResolvedValue(notifs);
      prisma.notification.count.mockResolvedValue(2);

      const result = await service.findAllByUser(USER_ID);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('filtra apenas não lidas quando unreadOnly=true', async () => {
      prisma.notification.findMany.mockResolvedValue([makeNotification()]);
      prisma.notification.count.mockResolvedValue(1);

      await service.findAllByUser(USER_ID, { unreadOnly: true });

      const findCall = prisma.notification.findMany.mock.calls[0][0];
      expect(findCall.where).toMatchObject({ status: 'UNREAD' });
    });

    it('retorna lista vazia quando usuário não tem notificações', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.findAllByUser(USER_ID);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ── getUnreadCount ────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('retorna contagem de notificações não lidas', async () => {
      prisma.notification.count.mockResolvedValue(3);

      const result = await service.getUnreadCount(USER_ID);

      expect(result.count).toBe(3);
      expect(prisma.notification.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, status: 'UNREAD' },
        }),
      );
    });

    it('retorna 0 quando não há notificações não lidas', async () => {
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.getUnreadCount(USER_ID);
      expect(result.count).toBe(0);
    });
  });

  // ── markRead ──────────────────────────────────────────────────

  describe('markRead', () => {
    it('marca notificação como lida', async () => {
      const notif = makeNotification({ userId: USER_ID });
      prisma.notification.findUnique.mockResolvedValue(notif);
      prisma.notification.update.mockResolvedValue({ ...notif, status: 'READ', readAt: new Date() });

      const result = await service.markRead(USER_ID, 'notif-001');

      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'READ', readAt: expect.any(Date) },
        }),
      );
      expect(result.status).toBe('READ');
    });

    it('lança NotFoundException para notificação inexistente', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markRead(USER_ID, 'ghost')).rejects.toThrow(NotFoundException);
    });

    it('lança ForbiddenException ao marcar notificação de outro usuário', async () => {
      const notif = makeNotification({ userId: OTHER_USER });
      prisma.notification.findUnique.mockResolvedValue(notif);

      await expect(service.markRead(USER_ID, 'notif-001')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── markAllRead ───────────────────────────────────────────────

  describe('markAllRead', () => {
    it('marca todas as notificações do usuário como lidas', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllRead(USER_ID);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID, status: 'UNREAD' },
          data: { status: 'READ', readAt: expect.any(Date) },
        }),
      );
      expect(result.count).toBe(5);
    });

    it('não falha quando não há notificações não lidas', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.markAllRead(USER_ID);
      expect(result.count).toBe(0);
    });
  });
});
