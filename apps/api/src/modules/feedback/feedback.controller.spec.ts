import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { FeedbackCategory } from './dto/create-feedback.dto';

describe('FeedbackController', () => {
  let controller: FeedbackController;
  let configService: jest.Mocked<ConfigService>;
  let feedbackService: jest.Mocked<FeedbackService>;

  function buildController(nodeEnv: string) {
    configService = {
      get: jest.fn((key: string, defaultVal?: unknown) => {
        if (key === 'NODE_ENV') return nodeEnv;
        return defaultVal;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    feedbackService = {
      submit: jest.fn().mockResolvedValue({ received: true }),
    } as unknown as jest.Mocked<FeedbackService>;

    return Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [
        { provide: ConfigService, useValue: configService },
        { provide: FeedbackService, useValue: feedbackService },
      ],
    })
      .compile()
      .then((m) => m.get(FeedbackController));
  }

  describe('health() — segurança e campos', () => {
    beforeEach(async () => {
      controller = await buildController('development');
    });

    it('retorna status ok', () => {
      const result = controller.health();
      expect(result.status).toBe('ok');
    });

    it('retorna campo app correto', () => {
      const result = controller.health();
      expect(result.app).toBe('selo-api');
    });

    it('retorna timestamp ISO válido', () => {
      const result = controller.health();
      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('retorna version', () => {
      const result = controller.health();
      expect(result.version).toBe('1.0.0-beta');
    });

    it('não expõe DATABASE_URL', () => {
      const result = controller.health() as Record<string, unknown>;
      expect(result['DATABASE_URL']).toBeUndefined();
      expect(JSON.stringify(result)).not.toContain('postgresql://');
      expect(JSON.stringify(result)).not.toContain('postgres://');
    });

    it('não expõe JWT_SECRET nem ADMIN_JWT_SECRET', () => {
      const result = controller.health() as Record<string, unknown>;
      expect(result['JWT_SECRET']).toBeUndefined();
      expect(result['ADMIN_JWT_SECRET']).toBeUndefined();
      expect(result['JWT_REFRESH_SECRET']).toBeUndefined();
    });

    it('não expõe BLOCKCHAIN_PRIVATE_KEY', () => {
      const result = controller.health() as Record<string, unknown>;
      expect(result['BLOCKCHAIN_PRIVATE_KEY']).toBeUndefined();
      expect(JSON.stringify(result)).not.toContain('PRIVATE_KEY');
    });

    it('modo sandbox em development', async () => {
      const ctrl = await buildController('development');
      expect(ctrl.health().mode).toBe('sandbox');
    });

    it('modo staging em NODE_ENV=staging', async () => {
      const ctrl = await buildController('staging');
      expect(ctrl.health().mode).toBe('staging');
    });

    it('modo sandbox em production (simulado até lançamento real)', async () => {
      const ctrl = await buildController('production');
      expect(ctrl.health().mode).toBe('sandbox');
    });

    it('env reflete NODE_ENV configurado', async () => {
      const ctrl = await buildController('staging');
      expect(ctrl.health().env).toBe('staging');
    });

    it('note indica ambiente de teste', () => {
      const result = controller.health();
      expect(result.note).toContain('teste');
    });
  });

  describe('submitFeedback()', () => {
    beforeEach(async () => {
      controller = await buildController('development');
    });

    it('delega ao FeedbackService e retorna received=true', async () => {
      const user = { id: 'user-1', email: 'a@b.com', sessionId: 'sess-1' };
      const dto = { category: FeedbackCategory.BUG, message: 'erro ao criar acordo', context: 'tela de criação' };

      const result = await controller.submitFeedback(user as any, dto as any);
      expect(result).toEqual({ received: true });
      expect(feedbackService.submit).toHaveBeenCalledWith('user-1', dto);
    });
  });
});
