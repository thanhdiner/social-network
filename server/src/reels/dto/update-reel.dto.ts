import { IsString, IsOptional } from 'class-validator';

export class UpdateReelDto {
  @IsOptional()
  @IsString()
  description?: string;
}
