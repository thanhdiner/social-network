import { IsString, IsOptional, IsIn } from 'class-validator';

export class CreateCommentLikeDto {
  @IsOptional()
  @IsString()
  @IsIn(['like', 'love', 'haha', 'wow', 'sad', 'angry'])
  type?: string = 'like';
}
