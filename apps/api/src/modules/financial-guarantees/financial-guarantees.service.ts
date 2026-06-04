import { Injectable, NotImplementedException } from '@nestjs/common';

// TODO: Fase 2 — implementar garantias financeiras

@Injectable()
export class FinancialGuaranteesService {
  findOne(_userId: string, _id: string) {
    throw new NotImplementedException('Financial guarantees — Fase 2');
  }

  create(_userId: string, _dto: unknown) {
    throw new NotImplementedException('Financial guarantees — Fase 2');
  }

  release(_userId: string, _id: string) {
    throw new NotImplementedException('Financial guarantees — Fase 2');
  }

  revert(_userId: string, _id: string) {
    throw new NotImplementedException('Financial guarantees — Fase 2');
  }
}
