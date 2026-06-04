import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateFinancialGuaranteeDto {
  @IsString()
  agreementId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
