import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const RATE_LIMIT_KEY = 'rate_limit';
export const SKIP_RATE_LIMIT_KEY = 'skip_rate_limit';

export interface RateLimitOptions {
  limit: number;
  ttl: number; // in seconds
}

/**
 * Decorator to apply custom rate limits to a controller or route handler.
 * @param limit Maximum number of requests allowed within the ttl window.
 * @param ttl Time-to-live window in seconds (default: 60s).
 */
export const RateLimit = (limit: number, ttl: number = 60) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, ttl });

/**
 * Decorator to skip rate limiting for a controller or route handler.
 */
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);

interface RateRecord {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  // In test environments (Jest runner, NODE_ENV === 'test'), bypass by default
  // Can be toggled to false during dedicated rate-limiting unit tests.
  public static bypassInTests: boolean = true;

  // In-memory token bucket / sliding window store
  private static storage: Map<string, RateRecord> = new Map();

  constructor(private reflector?: Reflector) {}

  /**
   * Clears the in-memory rate limiting store (useful for tests).
   */
  public static resetStorage(): void {
    RateLimitGuard.storage.clear();
  }

  canActivate(context: ExecutionContext): boolean {
    // 1. Bypass check for test execution
    if (
      RateLimitGuard.bypassInTests &&
      (process.env.NODE_ENV === 'test' ||
        process.env.JEST_WORKER_ID !== undefined ||
        process.env.DISABLE_RATE_LIMIT === 'true')
    ) {
      return true;
    }

    const handler = context.getHandler();
    const targetClass = context.getClass();

    // 2. Check if route explicitly skips rate limiting
    const isSkipped = this.reflector
      ? this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_KEY, [handler, targetClass])
      : false;
    if (isSkipped) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 3. Resolve rate limit configuration (custom decorator or sensitive defaults)
    const customConfig = this.reflector
      ? this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [handler, targetClass])
      : undefined;

    const rawPath = (request.originalUrl || request.url || request.path || '').toLowerCase();
    const normalizedPath = rawPath.split('?')[0] || '/';
    const config = customConfig || this.resolveDefaultConfig(normalizedPath);

    // 4. Resolve client identity (IP and endpoint key)
    const clientIp = this.getClientIp(request);
    const key = `${clientIp}:${normalizedPath}`;

    const now = Date.now();
    let record = RateLimitGuard.storage.get(key);

    if (!record || now >= record.resetAt) {
      record = {
        count: 1,
        resetAt: now + config.ttl * 1000,
      };
      RateLimitGuard.storage.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, config.limit - record.count);
    const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));

    // 5. Attach standard rate limiting headers if response object is available
    if (response && typeof response.setHeader === 'function') {
      response.setHeader('X-RateLimit-Limit', config.limit);
      response.setHeader('X-RateLimit-Remaining', remaining);
      response.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));
    }

    // 6. Enforce limit
    if (record.count > config.limit) {
      if (response && typeof response.setHeader === 'function') {
        response.setHeader('Retry-After', retryAfter);
      }
      this.logger.warn(`Rate limit exceeded for IP ${clientIp} on ${normalizedPath}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Juda ko'p so'rovlar yuborildi. Iltimos, keyinroq urinib ko'ring.",
          error: 'Too Many Requests',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Cleanup stale keys if map exceeds 5000 items
    if (RateLimitGuard.storage.size > 5000) {
      this.cleanup(now);
    }

    return true;
  }

  private resolveDefaultConfig(path: string): RateLimitOptions {
    // Sensitive route heuristics:
    if (path.includes('/auth/login')) {
      // Login endpoint: 5 attempts per 60 seconds (brute force protection)
      return { limit: 5, ttl: 60 };
    }
    if (path.includes('/bookings')) {
      // Trial bookings: 15 submissions per 60 seconds (bot / spam protection)
      return { limit: 15, ttl: 60 };
    }
    if (path.includes('/leads')) {
      // Lead ingestion: 20 submissions per 60 seconds (form injection protection)
      return { limit: 20, ttl: 60 };
    }
    if (path.includes('/ai/')) {
      // AI queries: 20 calls per 60 seconds (DoS defense on LLM API)
      return { limit: 20, ttl: 60 };
    }
    if (path.includes('/telegram/simulate')) {
      // Simulation endpoints: 5 submissions per 60 seconds
      return { limit: 5, ttl: 60 };
    }
    // Global fallback for standard API routes
    return { limit: 100, ttl: 60 };
  }

  private getClientIp(req: any): string {
    if (!req) return '127.0.0.1';
    const forwarded = req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0].trim();
    }
    return (
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      '127.0.0.1'
    );
  }

  private cleanup(now: number): void {
    for (const [k, rec] of RateLimitGuard.storage.entries()) {
      if (now >= rec.resetAt) {
        RateLimitGuard.storage.delete(k);
      }
    }
  }
}
