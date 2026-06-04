import { Injectable, NotImplementedException } from '@nestjs/common';

// TODO: Fase 2 — implementar eventos de acordo

@Injectable()
export class AgreementEventsService {
  findAllByAgreement(_userId: string, _agreementId: string) {
    throw new NotImplementedException('Agreement events — Fase 2');
  }

  create(_agreementId: string, _actorId: string, _type: string, _payload?: unknown) {
    throw new NotImplementedException('Agreement events — Fase 2');
  }
}
