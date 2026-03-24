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
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtGuard } from './admin.guard';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: { username: string; password: string }) {
    return this.adminAuthService.login(body.username, body.password);
  }

  @Get('me')
  @UseGuards(AdminJwtGuard)
  getMe(@Request() req: { admin: { adminId: string; username: string; name: string } }) {
    return req.admin;
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
}
