import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({ ...dto, password: hashed });
    return this.getTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    // Tìm user bằng email hoặc username
    let user = await this.usersService.findByEmail(dto.identifier);

    if (!user) {
      // Nếu không tìm thấy bằng email, thử tìm bằng username
      user = await this.usersService.findByUsername(dto.identifier);
    }

    if (!user)
      throw new UnauthorizedException(
        'Email/Username hoặc mật khẩu không đúng',
      );

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch)
      throw new UnauthorizedException(
        'Email/Username hoặc mật khẩu không đúng',
      );

    return this.getTokens(user.id, user.email);
  }

  async getTokens(userId: string, email: string) {
    const payload: JwtPayload = { sub: userId, email };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT secrets not configured');
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: '7d',
      }),
    ]);
    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string) {
    try {
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET');
      if (!refreshSecret) {
        throw new Error('JWT refresh secret not configured');
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        { secret: refreshSecret },
      );
      return this.getTokens(payload.sub, payload.email);
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }
}
