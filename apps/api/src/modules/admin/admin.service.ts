import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [users, agreements, disputes, payments] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.agreement.groupBy({ by: ['status'], _count: true }),
      this.prisma.dispute.groupBy({ by: ['status'], _count: true }),
      this.prisma.payment.groupBy({ by: ['status'], _count: true }),
    ]);

    return {
      users,
      agreements,
      disputes,
      payments,
      generatedAt: new Date().toISOString(),
    };
  }
}
