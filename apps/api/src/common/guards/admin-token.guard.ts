import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface AdminContext {
  id: string;
}

@Injectable()
export class AdminTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.headers['x-admin-token'];
    const expected = this.config.get<string>('ADMIN_TOKEN');

    if (!expected) {
      throw new UnauthorizedException('Autenticação administrativa não configurada.');
    }

    if (!token || token !== expected) {
      throw new UnauthorizedException('Token administrativo inválido ou ausente.');
    }

    (request as Request & { adminContext: AdminContext }).adminContext = {
      id: 'system-admin',
    };

    return true;
  }
}
