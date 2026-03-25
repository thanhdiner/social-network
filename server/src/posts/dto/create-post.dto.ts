import { IsString, IsOptional, IsNotEmpty, IsIn } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  content: string;

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
