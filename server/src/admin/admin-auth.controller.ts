import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtGuard } from './admin.guard';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 8 } })
  @HttpCode(HttpStatus.OK)
  login(
    @Body() body: { username: string; password: string },
    @Request() req: { headers?: Record<string, string | string[] | undefined>; ip?: string },
  ) {
    const rawUserAgent = req?.headers?.['user-agent'];
    const userAgent = Array.isArray(rawUserAgent)
      ? rawUserAgent[0]
      : rawUserAgent;

    return this.adminAuthService.login(body.username, body.password, {
      userAgent,
      ipAddress: req?.ip,
    });
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  getMe(
    @Request()
    req: {
      admin: { adminId: string; username: string; name: string; sessionId?: string };
    },
  ) {
    return this.adminAuthService.getAdminMe(
      req.admin.adminId,
      req.admin.sessionId,
    );
  }

  // Endpoint nội bộ để tạo admin đầu tiên (nên disable sau khi dùng)
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  createAdmin(
    @Body()
    body: {
      username: string;
      email: string;
      password: string;
      name: string;
      secret: string;
    },
  ) {
    // Bảo vệ bằng secret key đơn giản
    const allowedSecret =
      process.env.ADMIN_CREATE_SECRET || 'create_admin_secret_2024';
    if (body.secret !== allowedSecret) {
      return { error: 'Không có quyền tạo admin' };
    }
    return this.adminAuthService.createAdmin({
      username: body.username,
      email: body.email,
      password: body.password,
      name: body.name,
    });
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: { email: string }) {
    return this.adminAuthService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body()
    body: {
      email: string;
      code: string;
      newPassword: string;
      confirmPassword: string;
    },
  ) {
    return this.adminAuthService.resetPassword(
      body.email,
      body.code,
      body.newPassword,
      body.confirmPassword,
    );
  }
}
