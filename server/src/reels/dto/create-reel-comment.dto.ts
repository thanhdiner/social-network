import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateReelCommentDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
