import { IsNotEmpty, IsString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  imageUrl?: string; // URL của ảnh đính kèm trong comment

  @IsOptional()
  @IsInt()
  @Min(0)
  imageIndex?: number; // Index của ảnh trong post (null = comment chung)
}
