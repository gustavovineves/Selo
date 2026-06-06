import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminContext } from '../guards/admin-jwt.guard';

interface AdminJwtPayload {
  sub: string;
  email: string;
  role: string;
  type: string;
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('ADMIN_JWT_SECRET') ?? 'admin-jwt-secret-dev',
    });
  }

  async validate(payload: AdminJwtPayload): Promise<AdminContext> {
    if (payload.type !== 'admin') {
      throw new UnauthorizedException('Token inválido para acesso administrativo.');
    }

    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!admin || admin.status !== 'ACTIVE') {
      throw new UnauthorizedException('Administrador inativo ou não encontrado.');
    }

    return { id: admin.id, email: admin.email, role: admin.role };
  }
}
