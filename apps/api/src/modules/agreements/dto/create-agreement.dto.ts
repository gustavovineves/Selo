import {
  IsString, IsOptional, IsEnum, IsEmail, IsDateString, IsNumber, Min, MaxLength,
} from 'class-validator';
import { AgreementType } from '@prisma/client';

export class CreateAgreementDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @IsEnum(AgreementType)
  type?: AgreementType;

  @IsOptional()
  @IsEmail()
  counterpartEmail?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  terms?: string;
}
