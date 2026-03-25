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
import { RedisService } from '../common/redis/redis.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './interfaces/jwt-payload.interface';

const RESET_TOKEN_TTL = 60 * 60; // 1 hour in seconds
const RESET_TOKEN_PREFIX = 'pwd_reset:';

@Injectable()
export class AuthService {
  // Fallback in-memory store when Redis is unavailable
  private fallbackTokens = new Map<string, { userId: string; expiresAt: number }>();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    private redisService: RedisService,
  ) {}

  // ─── helpers ────────────────────────────────────────────────────────────────

  private async storeResetToken(code: string, userId: string): Promise<void> {
    if (this.redisService.isConnected()) {
      await this.redisService.set(
        `${RESET_TOKEN_PREFIX}${code}`,
        userId,
        RESET_TOKEN_TTL,
      );
    } else {
      this.fallbackTokens.set(code, {
        userId,
        expiresAt: Date.now() + RESET_TOKEN_TTL * 1000,
      });
    }
  }

  private async getResetToken(code: string): Promise<string | null> {
    if (this.redisService.isConnected()) {
      return this.redisService.get(`${RESET_TOKEN_PREFIX}${code}`);
    }
    const record = this.fallbackTokens.get(code);
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      this.fallbackTokens.delete(code);
      return null;
    }
    return record.userId;
  }

  private async deleteResetToken(code: string): Promise<void> {
    if (this.redisService.isConnected()) {
      await this.redisService.del(`${RESET_TOKEN_PREFIX}${code}`);
    } else {
      this.fallbackTokens.delete(code);
    }
  }

  private async clearUserResetTokens(userId: string): Promise<void> {
    if (this.redisService.isConnected()) {
      const keys = await this.redisService.keys(`${RESET_TOKEN_PREFIX}*`);
      for (const key of keys) {
        const storedUserId = await this.redisService.get(key);
        if (storedUserId === userId) {
          await this.redisService.del(key);
        }
      }
    } else {
      for (const [token, record] of this.fallbackTokens.entries()) {
        if (record.userId === userId) {
          this.fallbackTokens.delete(token);
        }
      }
    }
  }

  private generateResetCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  // ─── auth ────────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({ ...dto, password: hashed });
    return this.getTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    let user = await this.usersService.findByEmail(dto.identifier);
    if (!user) {
      user = await this.usersService.findByUsername(dto.identifier);
    }

    if (!user)
      throw new UnauthorizedException('Email/Username hoặc mật khẩu không đúng');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch)
      throw new UnauthorizedException('Email/Username hoặc mật khẩu không đúng');

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
      this.jwtService.signAsync(payload, { secret: accessSecret, expiresIn: '15m' }),
      this.jwtService.signAsync(payload, { secret: refreshSecret, expiresIn: '7d' }),
    ]);
    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string) {
    try {
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
      if (!refreshSecret) throw new Error('JWT refresh secret not configured');

      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
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

    await this.clearUserResetTokens(user.id);

    const code = this.generateResetCode();

    if (this.mailService.isEnabled()) {
      try {
        await this.mailService.sendPasswordResetCode(email, code);
      } catch (error) {
        throw error;
      }
      await this.storeResetToken(code, user.id);
      const expiresAt = Date.now() + RESET_TOKEN_TTL * 1000;
      return { expiresAt, mailSent: true as const };
    }

    await this.storeResetToken(code, user.id);
    const expiresAt = Date.now() + RESET_TOKEN_TTL * 1000;
    return { expiresAt, mailSent: false as const, debugCode: code };
  }

  async resetPassword(code: string, newPassword: string) {
    const userId = await this.getResetToken(code);
    if (!userId) {
      throw new NotFoundException('Mã xác thực không hợp lệ hoặc đã hết hạn');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashedPassword);
    await this.deleteResetToken(code);

    return { message: 'Đặt lại mật khẩu thành công' };
  }
}
