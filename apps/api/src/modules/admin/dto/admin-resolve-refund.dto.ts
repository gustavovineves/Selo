import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class AdminResolveRefundDto {
  @IsString()
  @MinLength(10, { message: 'A justificativa deve ter pelo menos 10 caracteres.' })
  @MaxLength(1000)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}
