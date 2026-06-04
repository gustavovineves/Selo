import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsOptional()
  @IsString()
  agreementId?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;
}
