import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  RateLimitGuard,
  RATE_LIMIT_KEY,
  SKIP_RATE_LIMIT_KEY,
} from './rate-limit.guard';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;

  const createMockExecutionContext = (
    url: string,
    ip: string = '192.168.1.1',
    headers: Record<string, string | string[]> = {},
    metadata: { rateLimit?: any; skipRateLimit?: boolean } = {},
  ): { context: ExecutionContext; responseHeaders: Record<string, any> } => {
    const responseHeaders: Record<string, any> = {};

    const mockRequest = {
      url,
      baseUrl: url,
      ip,
      headers: { ...headers },
      connection: { remoteAddress: ip },
      socket: { remoteAddress: ip },
    };

    const mockResponse = {
      setHeader: jest.fn((name: string, value: any) => {
        responseHeaders[name.toLowerCase()] = value;
      }),
    };

    const mockHandler = () => {};
    const mockClass = class TestController {};

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: string) => {
      if (key === SKIP_RATE_LIMIT_KEY) return metadata.skipRateLimit ?? false;
      if (key === RATE_LIMIT_KEY) return metadata.rateLimit ?? null;
      return null;
    });

    const context: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
        getNext: () => {},
      }),
      getHandler: () => mockHandler,
      getClass: () => mockClass,
      getArgs: () => [],
      getArgByIndex: () => ({}),
      switchToRpc: () => ({}),
      switchToWs: () => ({}),
      getType: () => 'http',
    };

    return { context: context as ExecutionContext, responseHeaders };
  };

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RateLimitGuard(reflector);
    RateLimitGuard.resetStorage();
    RateLimitGuard.bypassInTests = true;
  });

  afterEach(() => {
    RateLimitGuard.bypassInTests = true;
    RateLimitGuard.resetStorage();
  });

  describe('Test Environment Bypass', () => {
    it('should allow requests unconditionally when bypassInTests is true in test environment', () => {
      RateLimitGuard.bypassInTests = true;
      const { context } = createMockExecutionContext('/api/auth/login');

      // Send 20 requests (far exceeding 5 req limit)
      for (let i = 0; i < 20; i++) {
        expect(guard.canActivate(context)).toBe(true);
      }
    });
  });

  describe('Active Rate Limiting Enforcement (bypassInTests = false)', () => {
    beforeEach(() => {
      RateLimitGuard.bypassInTests = false;
    });

    it('should enforce login rate limit (5 attempts per minute)', () => {
      const { context, responseHeaders } = createMockExecutionContext('/api/auth/login', '10.0.0.1');

      // 5 allowed attempts
      for (let i = 0; i < 5; i++) {
        const allowed = guard.canActivate(context);
        expect(allowed).toBe(true);
        expect(responseHeaders['x-ratelimit-limit']).toBe(5);
        expect(responseHeaders['x-ratelimit-remaining']).toBe(4 - i);
      }

      // 6th attempt must be rejected with 429 Too Many Requests
      try {
        guard.canActivate(context);
        fail('Should have thrown 429 HttpException');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = err.getResponse() as any;
        expect(response.message).toBe("Juda ko'p so'rovlar yuborildi. Iltimos, keyinroq urinib ko'ring.");
        expect(response.error).toBe('Too Many Requests');
        expect(response.retryAfter).toBeGreaterThan(0);
        expect(responseHeaders['retry-after']).toBeGreaterThan(0);
      }
    });

    it('should enforce bookings rate limit (15 requests per minute)', () => {
      const { context } = createMockExecutionContext('/api/bookings', '10.0.0.2');

      for (let i = 0; i < 15; i++) {
        expect(guard.canActivate(context)).toBe(true);
      }

      expect(() => guard.canActivate(context)).toThrow(HttpException);
    });

    it('should enforce leads capture rate limit (20 requests per minute)', () => {
      const { context } = createMockExecutionContext('/api/leads', '10.0.0.3');

      for (let i = 0; i < 20; i++) {
        expect(guard.canActivate(context)).toBe(true);
      }

      expect(() => guard.canActivate(context)).toThrow(HttpException);
    });

    it('should enforce AI chat rate limit (20 requests per minute)', () => {
      const { context } = createMockExecutionContext('/api/ai/chat', '10.0.0.4');

      for (let i = 0; i < 20; i++) {
        expect(guard.canActivate(context)).toBe(true);
      }

      expect(() => guard.canActivate(context)).toThrow(HttpException);
    });

    it('should respect custom @RateLimit(limit, ttl) decorator override', () => {
      const { context } = createMockExecutionContext(
        '/api/custom-action',
        '10.0.0.5',
        {},
        { rateLimit: { limit: 3, ttl: 30 } },
      );

      // 3 allowed
      expect(guard.canActivate(context)).toBe(true);
      expect(guard.canActivate(context)).toBe(true);
      expect(guard.canActivate(context)).toBe(true);

      // 4th rejected
      expect(() => guard.canActivate(context)).toThrow(HttpException);
    });

    it('should skip rate limiting when route is decorated with @SkipRateLimit', () => {
      const { context } = createMockExecutionContext(
        '/api/auth/login',
        '10.0.0.6',
        {},
        { skipRateLimit: true },
      );

      for (let i = 0; i < 10; i++) {
        expect(guard.canActivate(context)).toBe(true);
      }
    });

    it('should distinguish different client IPs independently', () => {
      const clientA = createMockExecutionContext('/api/auth/login', '1.1.1.1').context;
      const clientB = createMockExecutionContext('/api/auth/login', '2.2.2.2').context;

      // Exhaust client A (5 requests)
      for (let i = 0; i < 5; i++) {
        expect(guard.canActivate(clientA)).toBe(true);
      }
      expect(() => guard.canActivate(clientA)).toThrow(HttpException);

      // Client B should still be allowed
      expect(guard.canActivate(clientB)).toBe(true);
    });

    it('should correctly extract IP from x-forwarded-for header string and array', () => {
      const headerContext1 = createMockExecutionContext(
        '/api/auth/login',
        '127.0.0.1',
        { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
      ).context;

      for (let i = 0; i < 5; i++) {
        expect(guard.canActivate(headerContext1)).toBe(true);
      }
      expect(() => guard.canActivate(headerContext1)).toThrow(HttpException);

      const headerContext2 = createMockExecutionContext(
        '/api/auth/login',
        '127.0.0.1',
        { 'x-forwarded-for': ['198.51.100.1', '10.0.0.1'] },
      ).context;

      expect(guard.canActivate(headerContext2)).toBe(true);
    });
  });
});
