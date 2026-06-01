import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({ url: REDIS_URL });

redisClient.on('error', (err) => console.error('[REDIS] Client error:', err));
redisClient.on('connect', () => console.log('[REDIS] Connected'));
redisClient.on('reconnecting', () => console.warn('[REDIS] Reconnecting...'));

export async function connectRedis() {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('[REDIS] Connection failed:', err.message);
    // Non-fatal — app can run without Redis
  }
}

export default redisClient;
