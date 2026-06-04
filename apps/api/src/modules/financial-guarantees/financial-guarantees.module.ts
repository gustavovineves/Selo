import { Module } from '@nestjs/common';
import { FinancialGuaranteesController } from './financial-guarantees.controller';
import { FinancialGuaranteesService } from './financial-guarantees.service';

@Module({
  controllers: [FinancialGuaranteesController],
  providers: [FinancialGuaranteesService],
  exports: [FinancialGuaranteesService],
})
export class FinancialGuaranteesModule {}
