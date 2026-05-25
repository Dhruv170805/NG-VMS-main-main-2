import Redis from 'ioredis';
import logger from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ compatibility
});

redisConnection.on('connect', () => {
  logger.info('[REDIS] Connected to Redis server');
});

redisConnection.on('error', (err) => {
  logger.error({ err }, '[REDIS] Connection error');
});

export default redisConnection;
