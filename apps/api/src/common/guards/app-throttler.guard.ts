import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { isAuthorizedRateLimitBypass } from './rate-limit-bypass.util';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    // Allow automated testing bypass ONLY if safely authorized via environment configuration
    if (isAuthorizedRateLimitBypass(req?.headers?.['x-bypass-rate-limit'])) {
      return true;
    }
    return super.canActivate(context);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req.user?._id?.toString() || req.user?.id || req.user?.userId;
    if (userId) {
      return `user_${userId}`;
    }
    const ip =
      req.ip ||
      (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      '127.0.0.1';
    return `ip_${ip}`;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: any,
  ): Promise<void> {
    const res = context.switchToHttp().getResponse();
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('Retry-After', Math.ceil((throttlerLimitDetail.timeToBlockExpire || 60000) / 1000).toString());
      res.setHeader('X-RateLimit-Limit', throttlerLimitDetail.limit.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
    }
    throw new ThrottlerException('Too many requests. Please slow down and try again later.');
  }
}
