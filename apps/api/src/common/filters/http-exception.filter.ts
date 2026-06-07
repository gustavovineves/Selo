import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

/**
 * Filtro global de exceções:
 * - Exceções HTTP: preserva o formato padrão do NestJS (sem quebrar contratos mobile/admin).
 * - Erros inesperados: loga internamente; em production oculta detalhes técnicos.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProd = process.env.NODE_ENV === 'production';

    if (exception instanceof HttpException) {
      // Preserva o formato padrão do NestJS — não quebra contratos existentes
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    // Erro inesperado (não-HTTP) — loga internamente
    this.logger.error(
      `Unhandled exception on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: isProd
        ? 'Erro interno do servidor.'
        : (exception instanceof Error ? exception.message : 'Erro inesperado.'),
    });
  }
}
