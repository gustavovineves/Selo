import { IsOptional, IsString, MinLength, MaxLength, IsISO8601 } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'birthDate must be a valid ISO 8601 date (e.g. 1990-05-20)' })
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;
}
