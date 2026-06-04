import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ReceivingDestinationType } from '@prisma/client';

export class CreateReceivingDestinationDto {
  @IsString()
  nickname: string;

  @IsEnum(ReceivingDestinationType)
  type: ReceivingDestinationType;

  @IsString()
  keyValue: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
