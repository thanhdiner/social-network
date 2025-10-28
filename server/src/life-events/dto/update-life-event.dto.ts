import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

export class UpdateLifeEventDto {
  @IsString()
  @IsOptional()
  @IsIn(['work', 'education', 'relationship', 'home', 'location', 'achievement', 'health', 'travel'])
  type?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  @IsIn(['public', 'friends', 'private'])
  privacy?: string;
}
