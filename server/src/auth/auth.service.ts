import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { UsersService } from '../users/users.service';
import { MailService } from '../common/mail/mail.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  // In-memory password reset tokens: token -> { userId, expiresAt }
  private passwordResetTokens = new Map<
    string,
    { userId: string; expiresAt: number }
  >();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  private generateResetCode(): string {
    let token: string;
    do {
      token = randomInt(100000, 1000000).toString();
    } while (this.passwordResetTokens.has(token));
    return token;
  }

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

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('Email không tồn tại trong hệ thống');
    }

    // Clear any existing reset tokens for this user
    for (const [token, record] of this.passwordResetTokens.entries()) {
      if (record.userId === user.id) {
        this.passwordResetTokens.delete(token);
      }
    }

    const code = this.generateResetCode();
    const expiresAt = Date.now() + 1000 * 60 * 60; // 1 hour

    this.passwordResetTokens.set(code, {
      userId: user.id,
      expiresAt,
    });

    if (this.mailService.isEnabled()) {
      try {
        await this.mailService.sendPasswordResetCode(email, code);
      } catch (error) {
        this.passwordResetTokens.delete(code);
        throw error;
      }
      return { expiresAt, mailSent: true as const };
    }

    return { expiresAt, mailSent: false as const, debugCode: code };
  }

  async resetPassword(code: string, newPassword: string) {
    const record = this.passwordResetTokens.get(code);
    if (!record) {
      throw new NotFoundException('Mã xác thực không hợp lệ hoặc đã hết hạn');
    }

    if (Date.now() > record.expiresAt) {
      this.passwordResetTokens.delete(code);
      throw new NotFoundException('Mã xác thực đã hết hạn');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(record.userId, hashedPassword);

    this.passwordResetTokens.delete(code);

    return { message: 'Đặt lại mật khẩu thành công' };
  }
}
