import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(private adminAuthService: AdminAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Không có token admin');
    }

    const token = authHeader.slice(7);

    try {
      const payload = await this.adminAuthService.verifyToken(token);
      // Attach admin info to request
      request.admin = {
        adminId: payload.sub,
        username: payload.username,
        name: payload.name,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Token admin không hợp lệ');
    }
  }
}
