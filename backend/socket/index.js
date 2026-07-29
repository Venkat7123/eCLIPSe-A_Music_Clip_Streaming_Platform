import { Server } from 'socket.io';

let io = null;

export function initSocket(server) {
  const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(...process.env.FRONTEND_URL.split(','));
  }
  if (process.env.ALLOWED_ORIGINS) {
    allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
  }

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    // Join playlist room
    socket.on('playlist:join', (playlistId) => {
      socket.join(`playlist:${playlistId}`);
    });

    // Leave playlist room
    socket.on('playlist:leave', (playlistId) => {
      socket.leave(`playlist:${playlistId}`);
    });

    // Join user-specific room for queue updates
    socket.on('user:join', (uid) => {
      socket.join(`user:${uid}`);
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

// Emit helpers (used by services/routes)

export function emitPlaylistTrackAdded(playlistId, track) {
  if (!io) return;
  io.to(`playlist:${playlistId}`).emit('playlist:track:added', {
    playlistId,
    track,
  });
}

export function emitPlaylistTrackRemoved(playlistId, trackId) {
  if (!io) return;
  // If called from cascade delete (no specific playlist), broadcast to all
  if (typeof trackId === 'string') {
    io.to(`playlist:${playlistId}`).emit('playlist:track:removed', {
      playlistId,
      trackId,
    });
  }
}

export function emitPlaylistReordered(playlistId, trackIds) {
  if (!io) return;
  io.to(`playlist:${playlistId}`).emit('playlist:reordered', {
    playlistId,
    trackIds,
  });
}

export function emitQueueUpdate(uid, queue) {
  if (!io) return;
  io.to(`user:${uid}`).emit('queue:update', { queue });
}
