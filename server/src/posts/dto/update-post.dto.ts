import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  @IsIn(['public', 'friends', 'private'])
  visibility?: string;
}
