import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
} from '@/lib/rate-limit';

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear rate limit store between tests
    vi.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const identifier = 'test-user-1';
      const config = { maxRequests: 5, windowMs: 60000 };

      const result1 = checkRateLimit(identifier, config);
      const result2 = checkRateLimit(identifier, config);
      const result3 = checkRateLimit(identifier, config);

      expect(result1.success).toBe(true);
      expect(result1.remaining).toBe(4);
      expect(result2.success).toBe(true);
      expect(result2.remaining).toBe(3);
      expect(result3.success).toBe(true);
      expect(result3.remaining).toBe(2);
    });

    it('should block requests after limit is reached', () => {
      const identifier = 'test-user-2';
      const config = { maxRequests: 3, windowMs: 60000 };

      // Use up the limit
      checkRateLimit(identifier, config); // 1
      checkRateLimit(identifier, config); // 2
      checkRateLimit(identifier, config); // 3

      // Should be blocked now
      const result = checkRateLimit(identifier, config);

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.reset).toBeGreaterThan(Date.now());
    });

    it('should isolate limits per identifier', () => {
      const config = { maxRequests: 2, windowMs: 60000 };

      const user1Result1 = checkRateLimit('user-1', config);
      const user2Result1 = checkRateLimit('user-2', config);
      const user1Result2 = checkRateLimit('user-1', config);
      const user2Result2 = checkRateLimit('user-2', config);

      expect(user1Result1.success).toBe(true);
      expect(user2Result1.success).toBe(true);
      expect(user1Result2.success).toBe(true);
      expect(user2Result2.success).toBe(true);

      // Now both should be at limit
      const user1Result3 = checkRateLimit('user-1', config);
      const user2Result3 = checkRateLimit('user-2', config);

      expect(user1Result3.success).toBe(false);
      expect(user2Result3.success).toBe(false);
    });

    it('should provide correct reset timestamp', () => {
      const identifier = 'test-user-3';
      const config = { maxRequests: 1, windowMs: 5000 }; // 5 second window

      const beforeTime = Date.now();
      const result = checkRateLimit(identifier, config);
      const afterTime = Date.now();

      expect(result.reset).toBeGreaterThanOrEqual(beforeTime + 5000);
      expect(result.reset).toBeLessThanOrEqual(afterTime + 5000);
    });

    it('should return correct limit and remaining values', () => {
      const identifier = 'test-user-4';
      const config = { maxRequests: 10, windowMs: 60000 };

      const result = checkRateLimit(identifier, config);

      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
      expect(result.success).toBe(true);
    });
  });

  describe('getClientIdentifier', () => {
    it('should use user ID when provided', () => {
      const mockRequest = new Request('http://localhost:3000');
      const userId = 'user-123';

      const identifier = getClientIdentifier(mockRequest, userId);

      expect(identifier).toBe('user:user-123');
    });

    it('should extract IP from x-forwarded-for header', () => {
      const mockRequest = new Request('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      });

      const identifier = getClientIdentifier(mockRequest);

      expect(identifier).toBe('ip:192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const mockRequest = new Request('http://localhost:3000', {
        headers: {
          'x-real-ip': '203.0.113.45',
        },
      });

      const identifier = getClientIdentifier(mockRequest);

      expect(identifier).toBe('ip:203.0.113.45');
    });

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const mockRequest = new Request('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '203.0.113.45',
        },
      });

      const identifier = getClientIdentifier(mockRequest);

      expect(identifier).toBe('ip:192.168.1.1');
    });

    it('should fallback to unknown when no IP is available', () => {
      const mockRequest = new Request('http://localhost:3000');

      const identifier = getClientIdentifier(mockRequest);

      expect(identifier).toBe('ip:unknown');
    });

    it('should prefer user ID over IP', () => {
      const mockRequest = new Request('http://localhost:3000', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });
      const userId = 'user-456';

      const identifier = getClientIdentifier(mockRequest, userId);

      expect(identifier).toBe('user:user-456');
    });
  });

  describe('RATE_LIMITS configuration', () => {
    it('should have appropriate login rate limit', () => {
      expect(RATE_LIMITS.login.maxRequests).toBe(5);
      expect(RATE_LIMITS.login.windowMs).toBe(15 * 60 * 1000); // 15 minutes
    });

    it('should have appropriate signup rate limit', () => {
      expect(RATE_LIMITS.signup.maxRequests).toBe(3);
      expect(RATE_LIMITS.signup.windowMs).toBe(60 * 60 * 1000); // 1 hour
    });

    it('should have appropriate checkin rate limit', () => {
      expect(RATE_LIMITS.checkin.maxRequests).toBe(10);
      expect(RATE_LIMITS.checkin.windowMs).toBe(60 * 1000); // 1 minute
    });

    it('should have appropriate trustee invite rate limit', () => {
      expect(RATE_LIMITS.trusteeInvite.maxRequests).toBe(20);
      expect(RATE_LIMITS.trusteeInvite.windowMs).toBe(60 * 60 * 1000); // 1 hour
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle rapid-fire requests correctly', () => {
      const identifier = 'rapid-user';
      const config = { maxRequests: 5, windowMs: 60000 };

      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(checkRateLimit(identifier, config));
      }

      // First 5 should succeed
      expect(results.slice(0, 5).every((r) => r.success)).toBe(true);

      // Next 5 should fail
      expect(results.slice(5).every((r) => !r.success)).toBe(true);
    });

    it('should handle login brute force scenario', () => {
      const email = 'victim@example.com';
      const identifier = `login:${email}`;
      const config = RATE_LIMITS.login;

      // Attacker makes rapid login attempts
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        attempts.push(checkRateLimit(identifier, config));
      }

      // Only first 5 attempts should succeed
      const successfulAttempts = attempts.filter((a) => a.success).length;
      expect(successfulAttempts).toBe(5);

      // Remaining should be blocked
      const blockedAttempts = attempts.filter((a) => !a.success).length;
      expect(blockedAttempts).toBe(5);
    });
  });
});
