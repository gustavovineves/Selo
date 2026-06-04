import { Injectable, NotImplementedException } from '@nestjs/common';

// TODO: Fase 3 — implementar sistema de disputas

@Injectable()
export class DisputesService {
  findOne(_userId: string, _id: string) {
    throw new NotImplementedException('Disputes — Fase 3');
  }

  create(_userId: string, _dto: unknown) {
    throw new NotImplementedException('Disputes — Fase 3');
  }

  resolve(_userId: string, _id: string, _dto: unknown) {
    throw new NotImplementedException('Disputes — Fase 3');
  }
}
