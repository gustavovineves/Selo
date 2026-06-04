import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AgreementOperationalStatus } from '@prisma/client';

export class ListAgreementsDto {
  @IsOptional()
  @IsEnum(AgreementOperationalStatus)
  status?: AgreementOperationalStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
