import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeclineAgreementDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
