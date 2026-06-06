import { IsEmail, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class AdminLoginDto {
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  @IsEmail({}, { message: 'Email inválido.' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Senha deve ter no mínimo 8 caracteres.' })
  password: string;
}
