import redisConnection from '../config/redis';
import { logger } from '../utils/logger';

export class CacheService {
  /**
   * Generates a standardized cache key
   */
  static generateKey(tenantId: string, entity: string, identifier: string = 'all'): string {
    return `tenant:${tenantId}:${entity}:${identifier}`;
  }

  /**
   * Retrieves data from cache. If not found, executes the fallback function,
   * caches the result, and returns it.
   */
  static async getOrSet<T>(key: string, fallback: () => Promise<T>, ttlSeconds: number = 86400): Promise<T> {
    try {
      const cachedData = await redisConnection.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as T;
      }
    } catch (error) {
      logger.error({ err: error, key }, '[CacheService] Cache get error');
    }

    // Cache miss, execute fallback
    const freshData = await fallback();

    // Set cache asynchronously to not block the request
    if (freshData) {
      this.set(key, freshData, ttlSeconds).catch(err => {
        logger.error({ err, key }, '[CacheService] Cache set error (async)');
      });
    }

    return freshData;
  }

  /**
   * Sets data in the cache with a TTL
   */
  static async set(key: string, data: any, ttlSeconds: number = 86400): Promise<void> {
    try {
      await redisConnection.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    } catch (error) {
      logger.error({ err: error, key }, '[CacheService] Cache set error');
    }
  }

  /**
   * Invalidates a specific cache key
   */
  static async invalidate(key: string): Promise<void> {
    try {
      await redisConnection.del(key);
    } catch (error) {
      logger.error({ err: error, key }, '[CacheService] Cache invalidate error');
    }
  }

  /**
   * Invalidates multiple cache keys using a pattern match
   * Note: SCAN should be used in production instead of KEYS for performance.
   * This implementation uses a non-blocking stream approach.
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const stream = redisConnection.scanStream({
        match: pattern,
        count: 100
      });

      stream.on('data', async (keys: string[]) => {
        if (keys.length) {
          const pipeline = redisConnection.pipeline();
          keys.forEach(key => pipeline.del(key));
          await pipeline.exec();
        }
      });
      
      return new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
    } catch (error) {
      logger.error({ err: error, pattern }, '[CacheService] Cache pattern invalidate error');
    }
  }
}
