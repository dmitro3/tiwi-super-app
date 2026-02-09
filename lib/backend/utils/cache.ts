/**
 * In-Memory Cache Utility
 * 
 * Simple in-memory cache with TTL support for wallet balances and transactions.
 * Uses Map-based storage with automatic expiration.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache with TTL (in milliseconds)
   */
  set<T>(key: string, value: T, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, {
      data: value,
      expiresAt,
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
let cacheInstance: InMemoryCache | null = null;

/**
 * Get singleton cache instance
 */
export function getCache(): InMemoryCache {
  if (!cacheInstance) {
    cacheInstance = new InMemoryCache();
  }
  return cacheInstance;
}

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  BALANCE: 30 * 1000, // 30 seconds
  TRANSACTIONS: 5 * 60 * 1000, // 5 minutes
  PRICES: 60 * 1000, // 1 minute
  CHART_DATA: 5 * 60 * 1000, // 5 minutes - prevents repeated API calls
};

