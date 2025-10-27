import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @IsString()
  @MinLength(3, { message: 'Username phải có ít nhất 3 ký tự' })
  @MaxLength(30, { message: 'Username không được quá 30 ký tự' })
  @Matches(/^[a-zA-Z0-9_]+$/, { 
    message: 'Username chỉ được chứa chữ cái, số và dấu gạch dưới' 
  })
  username: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @MaxLength(50, { message: 'Mật khẩu không được quá 50 ký tự' })
  password: string;

  @IsString()
  @MinLength(2, { message: 'Tên phải có ít nhất 2 ký tự' })
  @MaxLength(50, { message: 'Tên không được quá 50 ký tự' })
  name: string;
}
