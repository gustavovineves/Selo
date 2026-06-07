import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum FeedbackCategory {
  BUG = 'BUG',
  SUGGESTION = 'SUGGESTION',
  QUESTION = 'QUESTION',
  GENERAL = 'GENERAL',
}

export class CreateFeedbackDto {
  @IsEnum(FeedbackCategory)
  category: FeedbackCategory;

  @IsString()
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  context?: string;
}
