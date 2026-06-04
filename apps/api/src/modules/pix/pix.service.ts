import { Injectable, NotImplementedException } from '@nestjs/common';

// TODO: Fase 2 — implementar integração real com BaaS (Fitbank ou equivalente) para:
// - Geração de QR Code Pix dinâmico
// - Webhook de confirmação de pagamento
// - Consulta de status de transação

@Injectable()
export class PixService {
  async createCharge(_paymentId: string) {
    throw new NotImplementedException('Pix integration available in Phase 2');
  }

  async handleWebhook(_payload: unknown) {
    throw new NotImplementedException('Pix webhook available in Phase 2');
  }

  async queryTransaction(_txid: string) {
    throw new NotImplementedException('Pix query available in Phase 2');
  }
}
