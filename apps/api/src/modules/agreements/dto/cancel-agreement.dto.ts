import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelAgreementDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
