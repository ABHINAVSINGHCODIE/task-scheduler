import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';
import { env } from './env';

const useRedisMock = process.env.REDIS_MOCK === 'true';

let redisInstance: any;
let redisConn: any;

if (useRedisMock) {
  console.log('[Redis] Using in-memory Redis Mock.');
  redisInstance = new RedisMock();
  redisConn = redisInstance;
} else {
  redisConn = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null,
  };
  redisInstance = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
  });

  redisInstance.on('connect', () => {
    console.log('[Redis] Connected successfully.');
  });

  redisInstance.on('error', (err: any) => {
    console.error('[Redis] Connection error:', err.message);
  });
}

export const redis = redisInstance;
export const redisConnection = redisConn;
