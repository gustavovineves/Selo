import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsISO8601,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  AgreementOperationalStatus,
  AgreementType,
  AgreementFinancialStatus,
} from '@prisma/client';

export enum MyAgreementRole {
  CREATOR = 'creator',
  COUNTERPART = 'counterpart',
  PAYER = 'payer',
  RECEIVER = 'receiver',
}

function toBoolean(value: unknown): boolean | undefined {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return undefined;
}

export class ListAgreementsDto {
  @IsOptional()
  @IsEnum(AgreementOperationalStatus)
  status?: AgreementOperationalStatus;

  @IsOptional()
  @IsEnum(AgreementType)
  type?: AgreementType;

  @IsOptional()
  @IsEnum(AgreementFinancialStatus)
  financialStatus?: AgreementFinancialStatus;

  @IsOptional()
  @IsEnum(MyAgreementRole)
  myRole?: MyAgreementRole;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  pendingMyAction?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  hasGuarantee?: boolean;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  inDispute?: boolean;

  @IsOptional()
  @IsISO8601()
  dueBefore?: string;

  @IsOptional()
  @IsISO8601()
  dueAfter?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
