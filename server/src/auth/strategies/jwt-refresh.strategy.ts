import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.['refreshToken'] as string | null;
        },
      ]),
      secretOrKey: secret,
      passReqToCallback: true,
    } as any);
  }

  validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.cookies?.['refreshToken'];
    return { ...payload, refreshToken };
  }
}
