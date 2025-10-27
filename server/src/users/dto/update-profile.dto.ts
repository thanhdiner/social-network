import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsIn,
  IsDateString,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Tên phải có ít nhất 2 ký tự' })
  @MaxLength(50, { message: 'Tên không được quá 50 ký tự' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio không được quá 500 ký tự' })
  bio?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Nam', 'Nữ', 'Khác'], {
    message: 'Giới tính phải là Nam, Nữ hoặc Khác',
  })
  gender?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày sinh không hợp lệ' })
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Địa chỉ không được quá 200 ký tự' })
  address?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9\s\-+()]+$/, {
    message: 'Số điện thoại không hợp lệ',
  })
  @MaxLength(20, { message: 'Số điện thoại không được quá 20 ký tự' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Website không được quá 200 ký tự' })
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Facebook URL không được quá 200 ký tự' })
  facebook?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Instagram URL không được quá 200 ký tự' })
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Twitter URL không được quá 200 ký tự' })
  twitter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'LinkedIn URL không được quá 200 ký tự' })
  linkedin?: string;
}
