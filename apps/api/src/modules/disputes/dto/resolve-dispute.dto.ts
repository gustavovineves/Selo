import { IsString, IsEnum } from 'class-validator';
import { DisputeStatus } from '@prisma/client';

export class ResolveDisputeDto {
  @IsEnum(['RESOLVED_FAVOR_CREATOR', 'RESOLVED_FAVOR_COUNTERPART', 'CLOSED'])
  status: DisputeStatus;

  @IsString()
  resolution: string;
}
