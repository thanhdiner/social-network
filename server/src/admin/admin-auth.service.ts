/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface AdminJwtPayload {
  sub: string;
  username: string;
  name: string;
  type: 'admin';
}

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private get adminSecret(): string {
    return (
      this.configService.get<string>('ADMIN_JWT_SECRET') ||
      'fallback_admin_secret_change_me'
    );
  }

  async login(username: string, password: string) {
    const prismaAny = this.prisma as any;
    const admin = await prismaAny.admin.findFirst({
      where: {
        OR: [{ username }, { email: username }],
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    const token = await this.signToken(admin.id, admin.username, admin.name);

    return {
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        name: admin.name,
      },
    };
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

  private async signToken(id: string, username: string, name: string) {
    const payload: AdminJwtPayload = {
      sub: id,
      username,
      name,
      type: 'admin',
    };
    return this.jwtService.signAsync(payload, {
      secret: this.adminSecret,
      expiresIn: '8h',
    });
  }
}
