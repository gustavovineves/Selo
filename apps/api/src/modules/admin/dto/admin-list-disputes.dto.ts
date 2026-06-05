import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { DisputeStatus } from '@prisma/client';

export class AdminListDisputesDto {
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
