import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

// TODO: Fase 2 — integrar com PixModule para geração real de QR Code e cobrança

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(userId: string, id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { pixTransaction: true, agreement: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.payerId !== userId) throw new ForbiddenException();
    return payment;
  }

  async create(payerId: string, dto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: {
        payerId,
        agreementId: dto.agreementId,
        method: 'PIX',
        amount: dto.amount,
        currency: dto.currency ?? 'BRL',
        status: 'PENDING',
      },
    });
  }
}
