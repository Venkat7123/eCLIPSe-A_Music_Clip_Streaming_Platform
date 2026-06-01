import { redisClient } from '../config/redis.js';

const DEFAULT_TTL = 300; // 5 minutes

export async function cacheGet(key) {
  try {
    if (!redisClient.isReady) return null;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key, value, ttl = DEFAULT_TTL) {
  try {
    if (!redisClient.isReady) return;
    await redisClient.set(key, JSON.stringify(value), { EX: ttl });
  } catch {
    // Non-fatal
  }
}

export async function cacheDel(key) {
  try {
    if (!redisClient.isReady) return;
    await redisClient.del(key);
  } catch {
    // Non-fatal
  }
}

export async function cacheDelPattern(pattern) {
  try {
    if (!redisClient.isReady) return;
    const keys = await redisClient.keys(pattern);
    if (keys.length) await redisClient.del(keys);
  } catch {
    // Non-fatal
  }
}
