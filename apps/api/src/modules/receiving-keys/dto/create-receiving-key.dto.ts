import { IsString, IsEnum } from 'class-validator';
import { ReceivingKeyType } from '@prisma/client';

export class CreateReceivingKeyDto {
  @IsEnum(ReceivingKeyType)
  type: ReceivingKeyType;

  @IsString()
  key: string;
}
