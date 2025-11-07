import { IsOptional, IsString } from 'class-validator';

export class ShareReelDto {
  @IsOptional()
  @IsString()
  content?: string;
}

