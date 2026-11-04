import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@brands-creators/types';
import * as crypto from 'crypto';

@Injectable()
export class AdminOrCronGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Check for dedicated Cron Secret (via x-cron-secret header)
    const cronSecretHeader = request.headers['x-cron-secret'];
    const configuredSecret =
      this.configService.get<string>('notifications.cronSecret') ||
      process.env.CRON_SECRET;

    if (configuredSecret && cronSecretHeader && typeof cronSecretHeader === 'string') {
      try {
        const headerBuf = Buffer.from(cronSecretHeader);
        const secretBuf = Buffer.from(configuredSecret);
        if (
          headerBuf.length === secretBuf.length &&
          crypto.timingSafeEqual(headerBuf, secretBuf)
        ) {
          request.user = {
            sub: '00000000000000000000c001',
            userId: '00000000000000000000c001',
            id: '00000000000000000000c001',
            fullName: 'Hostinger Cron Scheduler',
            email: 'cron@brandsandcreators.com',
            role: UserRole.SUPER_ADMIN,
            roles: [UserRole.SUPER_ADMIN],
            isCron: true,
          };
          return true;
        }
      } catch {
        // Fall through to JWT auth
      }
    }

    // 2. Fall back to Bearer JWT (Admin or Super Admin token)
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authentication required: Valid Admin JWT or valid x-cron-secret header is required',
      );
    }

    const token = authHeader.split(' ')[1];
    try {
      const accessSecret =
        this.configService.get<string>('jwt.accessSecret') ||
        process.env.JWT_ACCESS_SECRET ||
        'dev_jwt_access_secret_brands_creators_2026';
      const payload = this.jwtService.verify(token, { secret: accessSecret });
      const roles: string[] = payload.roles || (payload.role ? [payload.role] : []);
      if (!roles.includes(UserRole.ADMIN) && !roles.includes(UserRole.SUPER_ADMIN)) {
        throw new ForbiddenException(
          'Admin authorization required to trigger queue processor',
        );
      }
      request.user = {
        ...payload,
        isCron: false,
      };
      return true;
    } catch (err: any) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
