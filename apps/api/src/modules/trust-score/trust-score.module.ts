import { Module } from '@nestjs/common';
import { TrustScoreController } from './trust-score.controller';
import { TrustScoreService } from './trust-score.service';

@Module({
  controllers: [TrustScoreController],
  providers: [TrustScoreService],
  exports: [TrustScoreService],
})
export class TrustScoreModule {}
