import { IsString, MaxLength } from 'class-validator';

export class OpenDisputeDto {
  @IsString()
  @MaxLength(200)
  reason: string;

  @IsString()
  @MaxLength(2000)
  description: string;
}
