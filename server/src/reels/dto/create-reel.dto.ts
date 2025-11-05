import { IsString, IsOptional, IsUrl } from 'class-validator';

export class CreateReelDto {
  @IsUrl()
  videoUrl: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
