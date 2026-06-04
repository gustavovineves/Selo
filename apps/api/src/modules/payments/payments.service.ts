import { Injectable, NotImplementedException } from '@nestjs/common';

// TODO: Fase 2 — implementar PaymentIntent e fluxo de pagamento

@Injectable()
export class PaymentsService {
  findOne(_userId: string, _id: string) {
    throw new NotImplementedException('Payments — Fase 2');
  }

  create(_payerId: string, _dto: unknown) {
    throw new NotImplementedException('Payments — Fase 2');
  }
}
