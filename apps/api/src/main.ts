import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    // Em produção suprime stack traces no console padrão do NestJS
    logger: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Filtro global: preserva formato NestJS para HTTP exceptions;
  // oculta detalhes de erros inesperados em production
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS por ambiente
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const corsOriginsRaw = process.env.CORS_ORIGINS ?? '';

  let corsOrigins: string | string[];

  if (nodeEnv === 'test') {
    // Testes E2E usam chamadas diretas a serviços — CORS não é restritivo
    corsOrigins = '*';
  } else if (corsOriginsRaw) {
    corsOrigins = corsOriginsRaw.split(',').map((o) => o.trim()).filter(Boolean);
  } else if (nodeEnv === 'development') {
    corsOrigins = ['http://localhost:3001', 'http://localhost:8081'];
  } else {
    // staging/production sem CORS_ORIGINS definido → rejeitar wildcard
    logger.warn('CORS_ORIGINS não definido — CORS restrito a origens vazias.');
    corsOrigins = [];
  }

  app.enableCors({ origin: corsOrigins, credentials: true });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`Selo API running on http://localhost:${port}/api/v1 [${nodeEnv}]`);
}

bootstrap();
