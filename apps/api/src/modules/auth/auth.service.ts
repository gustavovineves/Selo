import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface SessionMeta {
  ip?: string;
  userAgent?: string;
}

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  status: true,
  kycStatus: true,
  emailVerifiedAt: true,
  createdAt: true,
  profile: {
    select: {
      id: true,
      fullName: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  trustScore: { select: { score: true, level: true } },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ------------------------------------------------------------------
  // Register
  // ------------------------------------------------------------------

  async register(dto: RegisterDto, meta: SessionMeta = {}) {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const fullName = [dto.firstName, dto.lastName].filter(Boolean).join(' ');

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: {
          create: {
            fullName,
            displayName: dto.firstName,
          },
        },
        trustScore: {
          create: { score: 500 },
        },
      },
      select: SAFE_USER_SELECT,
    });

    const { accessToken, refreshToken } = await this.createSession(
      user.id,
      user.email,
      meta,
    );

    return { user, accessToken, refreshToken };
  }

  // ------------------------------------------------------------------
  // Login
  // ------------------------------------------------------------------

  async login(dto: LoginDto, meta: SessionMeta = {}) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        ...SAFE_USER_SELECT,
        passwordHash: true,
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is unavailable');
    }

    const { accessToken, refreshToken } = await this.createSession(
      user.id,
      user.email,
      meta,
    );

    // Never return passwordHash to the client
    const { passwordHash: _omit, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  }

  // ------------------------------------------------------------------
  // Refresh token
  // ------------------------------------------------------------------

  async refresh(rawToken: string) {
    let payload: { sub: string; email: string; sid: string };

    try {
      payload = this.jwtService.verify(rawToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!payload?.sid) {
      throw new UnauthorizedException('Malformed token — missing session ID');
    }

    const session = await this.prisma.deviceSession.findUnique({
      where: { id: payload.sid },
    });

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Session not found');
    }
    if (session.revokedAt) {
      throw new UnauthorizedException('Session has been revoked');
    }
    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session has expired');
    }

    // Token reuse detection: if stored token doesn't match, revoke and reject
    if (session.refreshToken !== rawToken) {
      await this.prisma.deviceSession
        .update({ where: { id: session.id }, data: { revokedAt: new Date() } })
        .catch(() => {});
      throw new UnauthorizedException('Token reuse detected — session revoked');
    }

    const accessToken = this.buildAccessToken(
      session.userId,
      payload.email,
      session.id,
    );
    return { accessToken };
  }

  // ------------------------------------------------------------------
  // Logout
  // ------------------------------------------------------------------

  async logout(sessionId?: string) {
    if (!sessionId) return;

    await this.prisma.deviceSession
      .update({ where: { id: sessionId }, data: { revokedAt: new Date() } })
      .catch(() => {}); // gracefully ignore if already revoked or not found
  }

  // ------------------------------------------------------------------
  // Get current user
  // ------------------------------------------------------------------

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        status: true,
        kycStatus: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            id: true,
            fullName: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            city: true,
            state: true,
            country: true,
            birthDate: true,
          },
        },
        trustScore: { select: { score: true, level: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private async createSession(userId: string, email: string, meta: SessionMeta) {
    const sessionId = randomUUID();
    const expiresAt = this.parseExpiry(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );

    const accessToken = this.buildAccessToken(userId, email, sessionId);
    const refreshToken = this.buildRefreshToken(userId, email, sessionId);

    await this.prisma.deviceSession.create({
      data: {
        id: sessionId,
        userId,
        refreshToken,
        ip: meta.ip,
        userAgent: meta.userAgent,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private buildAccessToken(userId: string, email: string, sessionId: string): string {
    return this.jwtService.sign({ sub: userId, email, sid: sessionId });
  }

  private buildRefreshToken(userId: string, email: string, sessionId: string): string {
    return this.jwtService.sign(
      { sub: userId, email, sid: sessionId },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );
  }

  private parseExpiry(expiry: string): Date {
    const match = /^(\d+)(s|m|h|d)$/.exec(expiry);
    if (!match) return new Date(Date.now() + 7 * 86_400_000);
    const [, amount, unit] = match;
    const ms: Record<string, number> = {
      s: 1_000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return new Date(Date.now() + parseInt(amount) * (ms[unit] ?? 86_400_000));
  }
}
