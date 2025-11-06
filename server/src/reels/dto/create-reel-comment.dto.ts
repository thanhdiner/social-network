import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateReelCommentDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
