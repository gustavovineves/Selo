import { IsString, IsOptional } from 'class-validator';

export class FitbankWebhookDto {
  @IsString()
  event: string;

  @IsOptional()
  @IsString()
  txid?: string;

  @IsOptional()
  @IsString()
  amount?: string;

  @IsOptional()
  @IsString()
  endToEndId?: string;

  @IsOptional()
  @IsString()
  paymentDate?: string;
}
