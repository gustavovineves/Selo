import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { DisputeMessageType } from '@prisma/client';

export class AddDisputeMessageDto {
  @IsString()
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsEnum(DisputeMessageType)
  type?: DisputeMessageType;
}
