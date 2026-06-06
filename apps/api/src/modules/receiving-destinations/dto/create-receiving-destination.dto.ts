import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ReceivingDestinationType } from '@prisma/client';

export class CreateReceivingDestinationDto {
  @IsEnum(ReceivingDestinationType)
  type: ReceivingDestinationType;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  pixKey: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
