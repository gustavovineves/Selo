import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SimulateKycRejectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
