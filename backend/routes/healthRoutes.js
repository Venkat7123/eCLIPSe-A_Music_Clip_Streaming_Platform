import { Router } from 'express';
import mongoose from 'mongoose';
import { redisClient } from '../config/redis.js';

const router = Router();

// GET /health — MongoDB + Redis ping
router.get('/health', async (req, res) => {
  const checks = {
    mongodb: 'unknown',
    redis: 'unknown',
  };

  try {
    await mongoose.connection.db.admin().ping();
    checks.mongodb = 'ok';
  } catch {
    checks.mongodb = 'error';
  }

  try {
    if (redisClient.isReady) {
      await redisClient.ping();
      checks.redis = 'ok';
    } else {
      checks.redis = 'disconnected';
    }
  } catch {
    checks.redis = 'error';
  }

  const allOk = checks.mongodb === 'ok' && checks.redis === 'ok';
  const status = allOk ? 200 : 503;

  res.status(status).json({
    ok: allOk,
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
