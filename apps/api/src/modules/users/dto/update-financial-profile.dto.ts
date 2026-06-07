import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateFinancialProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'CPF deve conter exatamente 11 dígitos numéricos.' })
  cpf?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Data de nascimento inválida.' })
  birthDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Telefone inválido.' })
  phone?: string;

  @IsOptional()
  @IsBoolean()
  acceptedFinancialTerms?: boolean;
}
