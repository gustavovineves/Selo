import { IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateReceivingKeyDto {
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  key: string;
}
