import { IsString, IsNotEmpty, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreateLifeEventDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['work', 'education', 'relationship', 'home', 'location', 'achievement', 'health', 'travel'])
  type: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

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
