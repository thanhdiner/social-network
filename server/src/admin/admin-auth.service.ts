/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { MailService } from '../common/mail/mail.service';

export interface AdminJwtPayload {
  sub: string;
  username: string;
  name: string;
  sid?: string;
  type: 'admin';
}

interface AdminLoginContext {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  private get adminSecret(): string {
    return (
      this.configService.get<string>('ADMIN_JWT_SECRET') ||
      'fallback_admin_secret_change_me'
    );
  }

  async login(username: string, password: string, context?: AdminLoginContext) {
    const prismaAny = this.prisma as any;
    const admin = await prismaAny.admin.findFirst({
      where: {
        OR: [{ username }, { email: username }],
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        password: true,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    return this.createAdminAuthSession(admin, context);
  }

  async verifyToken(token: string): Promise<AdminJwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<AdminJwtPayload>(
        token,
        { secret: this.adminSecret },
      );
      if (payload.type !== 'admin') {
        throw new UnauthorizedException('Token không hợp lệ');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  async createAdmin(data: {
    username: string;
    email: string;
    password: string;
    name: string;
  }) {
    const prismaAny = this.prisma as any;

    const existing = await prismaAny.admin.findFirst({
      where: {
        OR: [{ username: data.username }, { email: data.email }],
      },
    });

    if (existing) {
      throw new ConflictException('Username hoặc email đã tồn tại');
    }

    const hashed = await bcrypt.hash(data.password, 10);
    const admin = await prismaAny.admin.create({
      data: { ...data, password: hashed },
    });

    return {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      name: admin.name,
    };
  }

  async forgotPassword(email: string) {
    const prismaAny = this.prisma as any;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      throw new BadRequestException('Email không được để trống');
    }

    const admin = await prismaAny.admin.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true },
    });

    // Always return success to avoid email enumeration
    if (!admin) {
      return {
        message: 'Nếu email tồn tại trong hệ thống, mã xác nhận đã được gửi',
      };
    }

    // Generate 6-digit code
    const code = randomInt(100000, 1000000).toString();
    const tokenHash = await bcrypt.hash(code, 8);
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prismaAny.admin.update({
      where: { id: admin.id },
      data: {
        resetPasswordToken: tokenHash,
        resetPasswordExpiry: expiry,
      },
    });

    await this.mailService.sendAdminPasswordReset(admin.email, code);

    return {
      message: 'Nếu email tồn tại trong hệ thống, mã xác nhận đã được gửi',
      ...(this.mailService.isEnabled() ? {} : { debugCode: code }),
    };
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    const prismaAny = this.prisma as any;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const trimmedCode = String(code || '').trim();

    if (!normalizedEmail || !trimmedCode || !newPassword) {
      throw new BadRequestException('Thiếu thông tin bắt buộc');
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 8 ký tự');
    }

    const admin = await prismaAny.admin.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        resetPasswordToken: true,
        resetPasswordExpiry: true,
      },
    });

    if (!admin || !admin.resetPasswordToken || !admin.resetPasswordExpiry) {
      throw new BadRequestException('Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    if (new Date() > new Date(admin.resetPasswordExpiry)) {
      // Clear expired token
      await prismaAny.admin.update({
        where: { id: admin.id },
        data: { resetPasswordToken: null, resetPasswordExpiry: null },
      });
      throw new BadRequestException('Mã đặt lại mật khẩu đã hết hạn');
    }

    const isValid = await bcrypt.compare(trimmedCode, admin.resetPasswordToken);
    if (!isValid) {
      throw new BadRequestException('Mã xác nhận không đúng');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear token
    await prismaAny.admin.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      },
    });

    // Revoke all active sessions for security
    await prismaAny.adminSession.updateMany({
      where: { adminId: admin.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' };
  }

  async getAdminMe(adminId: string, sessionId?: string) {
    const prismaAny = this.prisma as any;

    const admin = await prismaAny.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        avatar: true,
        loginAlertsEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Tài khoản admin không tồn tại');
    }

    await this.touchSession(adminId, sessionId);

    return {
      adminId: admin.id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      avatar: admin.avatar,
      loginAlertsEnabled: admin.loginAlertsEnabled,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      sessionId: sessionId || null,
    };
  }

  private resolveDeviceName(userAgent?: string) {
    const raw = String(userAgent || '').toLowerCase();

    if (!raw) return 'Unknown Device';
    if (raw.includes('iphone')) return 'iPhone';
    if (raw.includes('android')) return 'Android Phone';
    if (raw.includes('ipad')) return 'iPad';
    if (raw.includes('macintosh') || raw.includes('mac os')) return 'Mac Device';
    if (raw.includes('windows')) return 'Windows PC';
    if (raw.includes('linux')) return 'Linux Device';

    return 'Browser Session';
  }

  private async touchSession(adminId: string, sessionId?: string) {
    if (!sessionId) return;
    const prismaAny = this.prisma as any;

    await prismaAny.adminSession.updateMany({
      where: {
        id: sessionId,
        adminId,
        revokedAt: null,
      },
      data: {
        lastActiveAt: new Date(),
      },
    });
  }

  private async createAdminAuthSession(
    admin: { id: string; username: string; name: string; email: string },
    context?: AdminLoginContext,
  ) {
    const prismaAny = this.prisma as any;

    const session = await prismaAny.adminSession.create({
      data: {
        adminId: admin.id,
        device: this.resolveDeviceName(context?.userAgent),
        ipAddress: context?.ipAddress || null,
        userAgent: context?.userAgent || null,
        location: null,
      },
      select: { id: true },
    });

    const token = await this.signToken(
      admin.id,
      admin.username,
      admin.name,
      session.id,
    );

    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        name: admin.name,
      },
      sessionId: session.id,
    };
  }

  private async signToken(
    id: string,
    username: string,
    name: string,
    sessionId?: string,
  ) {
    const payload: AdminJwtPayload = {
      sub: id,
      username,
      name,
      sid: sessionId,
      type: 'admin',
    };
    return this.jwtService.signAsync(payload, {
      secret: this.adminSecret,
      expiresIn: '8h',
    });
  }
}
