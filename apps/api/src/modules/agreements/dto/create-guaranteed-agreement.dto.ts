import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ConfirmationRule, ReleaseRule, RefundRule, DisputeRule } from '@prisma/client';

export class CreateGuaranteedAgreementDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  counterpartyKey: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsDateString()
  acceptanceExpiresAt?: string;

  @IsOptional()
  @IsDateString()
  confirmationDeadlineAt?: string;

  @IsOptional()
  @IsEnum(ConfirmationRule)
  confirmationRule?: ConfirmationRule;

  @IsOptional()
  @IsEnum(ReleaseRule)
  releaseRule?: ReleaseRule;

  @IsOptional()
  @IsEnum(RefundRule)
  refundRule?: RefundRule;

  @IsOptional()
  @IsEnum(DisputeRule)
  disputeRule?: DisputeRule;
}
