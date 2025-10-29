import { IsString, IsOptional } from 'class-validator';

export class CreateStoryDto {
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;
}
