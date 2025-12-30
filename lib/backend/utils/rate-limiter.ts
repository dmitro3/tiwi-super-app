/**
 * Rate Limiter
 * 
 * Simple in-memory rate limiter for API endpoints.
 * Tracks requests per address/IP with sliding window.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed
   * @param key - Unique identifier (address, IP, etc.)
   * @param maxRequests - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns true if allowed, false if rate limited
   */
  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);
    
    if (!entry || now > entry.resetAt) {
      // Create new entry or reset expired entry
      this.limits.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return true;
    }
    
    if (entry.count >= maxRequests) {
      return false;
    }
    
    entry.count++;
    return true;
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string, maxRequests: number): number {
    const entry = this.limits.get(key);
    if (!entry) {
      return maxRequests;
    }
    
    if (Date.now() > entry.resetAt) {
      return maxRequests;
    }
    
    return Math.max(0, maxRequests - entry.count);
  }

  /**
   * Get reset time for a key
   */
  getResetTime(key: string): number | null {
    const entry = this.limits.get(key);
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.resetAt) {
      return null;
    }
    
    return entry.resetAt;
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Clear all limits
   */
  clear(): void {
    this.limits.clear();
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

/**
 * Get singleton rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

// Rate limit constants
export const RATE_LIMITS = {
  BALANCE: {
    maxRequests: 100, // 100 requests
    windowMs: 60 * 1000, // per minute
  },
  TRANSACTIONS: {
    maxRequests: 60, // 60 requests
    windowMs: 60 * 1000, // per minute
  },
};

