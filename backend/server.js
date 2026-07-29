// eCLIPSe Backend Server — Express API with MongoDB, Redis, Socket.io
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';

import { connectDB } from './config/db.js';
import { connectRedis } from './config/redis.js';
import { initSocket } from './socket/index.js';

import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import trackRoutes from './routes/trackRoutes.js';
import playlistRoutes from './routes/playlistRoutes.js';
import streamRoutes from './routes/streamRoutes.js';
import userRoutes from './routes/userRoutes.js';
import clipRoutes from './routes/clipRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import coverRoutes from './routes/coverRoutes.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8080;

// CORS
const allowedOrigins = ['https://eclipse-music.vercel.app', 'http://localhost:5173', 'http://127.0.0.1:5173'];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(...process.env.FRONTEND_URL.split(','));
}
if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Body parsing
app.use(express.json());

// Rate limiting
app.use(globalLimiter);

// Serve uploaded files statically
app.use('/uploads', express.static(path.resolve('uploads')));

// Health check (no auth)
app.use('/', healthRoutes);

// API routes
app.use('/api', authRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/user', userRoutes);
app.use('/api/clips', clipRoutes);
app.use('/api/covers', coverRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start
async function start() {
  initSocket(httpServer);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log('==================================================');
    console.log(`eCLIPSe Backend Server listening at http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('==================================================');
  });

  // Connect to database and cache asynchronously in the background
  connectDB().catch((err) => {
    console.error('[SERVER] Unexpected DB start error:', err);
  });
  connectRedis().catch((err) => {
    console.error('[SERVER] Unexpected Redis start error:', err);
  });
}

start().catch((err) => {
  console.error('[SERVER] Failed to start:', err);
  process.exit(1);
});
