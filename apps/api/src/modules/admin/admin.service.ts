import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [totalUsers, totalAgreements, totalDisputes] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.agreement.count(),
      this.prisma.dispute.count(),
    ]);

    return {
      totalUsers,
      totalAgreements,
      totalDisputes,
      generatedAt: new Date().toISOString(),
    };
  }
}
