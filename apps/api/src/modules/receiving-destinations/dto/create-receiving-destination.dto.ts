import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ReceivingKeyType } from '@prisma/client';

export class CreateReceivingDestinationDto {
  @IsString()
  nickname: string;

  @IsEnum(ReceivingKeyType)
  keyType: ReceivingKeyType;

  @IsString()
  keyValue: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
