import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';

import { isAuthorizedRateLimitBypass } from './rate-limit-bypass.util';

interface RateLimitRecord {
  timestamps: number[];
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private static store = new Map<string, RateLimitRecord>();
  private readonly logger = new Logger('RateLimitGuard');

  constructor(private readonly reflector: Reflector) {
    // Periodic garbage collection every 10 minutes for inactive keys
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of RateLimitGuard.store.entries()) {
        const activeTimestamps = record.timestamps.filter((t) => now - t < 3600000);
        if (activeTimestamps.length === 0) {
          RateLimitGuard.store.delete(key);
        } else {
          record.timestamps = activeTimestamps;
        }
      }
    }, 600000).unref();
  }

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If endpoint has no rate limit decorator, allow by default
    if (!options) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    // Check optional test bypass header for automated regression suites (strictly guarded)
    if (isAuthorizedRateLimitBypass(req.headers?.['x-bypass-rate-limit'])) {
      return true;
    }

    const ip =
      req.ip ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      '127.0.0.1';

    const userId = req.user?._id?.toString() || req.user?.id || req.user?.userId;
    const clientIdentifier = userId ? `user:${userId}` : `ip:${ip}`;
    const prefix = options.keyPrefix || context.getHandler().name;
    const trackingKey = `${prefix}:${clientIdentifier}`;

    const now = Date.now();
    const windowStart = now - options.ttlSeconds * 1000;

    let record = RateLimitGuard.store.get(trackingKey);
    if (!record) {
      record = { timestamps: [] };
      RateLimitGuard.store.set(trackingKey, record);
    }

    // Keep timestamps within current sliding window
    record.timestamps = record.timestamps.filter((t) => t > windowStart);

    const isExceeded = record.timestamps.length >= options.limit;
    const remaining = Math.max(0, options.limit - record.timestamps.length - (isExceeded ? 0 : 1));
    const oldestTimestamp = record.timestamps[0] || now;
    const resetTime = Math.ceil((oldestTimestamp + options.ttlSeconds * 1000) / 1000);
    const retryAfter = Math.max(1, Math.ceil((oldestTimestamp + options.ttlSeconds * 1000 - now) / 1000));

    // Set standard rate limit headers
    if (typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', options.limit.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toString());
    }

    if (isExceeded) {
      if (typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', retryAfter.toString());
      }
      this.logger.warn(`Rate limit exceeded for ${clientIdentifier} on ${prefix} (${options.limit} req / ${options.ttlSeconds}s)`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many requests on ${prefix}. Please try again in ${retryAfter} seconds.`,
          error: 'Too Many Requests',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.timestamps.push(now);
    return true;
  }
}
