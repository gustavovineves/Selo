import { Injectable, NotImplementedException } from '@nestjs/common';

// TODO: Fase 2 — implementar acordos simples e com garantia

@Injectable()
export class AgreementsService {
  findAllByUser(_userId: string, _query: unknown) {
    throw new NotImplementedException('Agreements — Fase 2');
  }

  findOne(_userId: string, _id: string) {
    throw new NotImplementedException('Agreements — Fase 2');
  }

  create(_creatorId: string, _dto: unknown) {
    throw new NotImplementedException('Agreements — Fase 2');
  }

  accept(_userId: string, _id: string) {
    throw new NotImplementedException('Agreements — Fase 2');
  }

  complete(_userId: string, _id: string) {
    throw new NotImplementedException('Agreements — Fase 2');
  }

  cancel(_userId: string, _id: string) {
    throw new NotImplementedException('Agreements — Fase 2');
  }
}
