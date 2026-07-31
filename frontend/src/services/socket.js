import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

let socket = null;

export function connectSocket() {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[SOCKET] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[SOCKET] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[SOCKET] Connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

// Room management
export function joinPlaylistRoom(playlistId) {
  socket?.emit('playlist:join', playlistId);
}

export function leavePlaylistRoom(playlistId) {
  socket?.emit('playlist:leave', playlistId);
}

export function joinUserRoom(uid) {
  socket?.emit('user:join', uid);
}

// Event listeners
export function onPlaylistTrackAdded(callback) {
  socket?.on('playlist:track:added', callback);
  return () => socket?.off('playlist:track:added', callback);
}

export function onPlaylistTrackRemoved(callback) {
  socket?.on('playlist:track:removed', callback);
  return () => socket?.off('playlist:track:removed', callback);
}

export function onPlaylistReordered(callback) {
  socket?.on('playlist:reordered', callback);
  return () => socket?.off('playlist:reordered', callback);
}

export function onQueueUpdate(callback) {
  socket?.on('queue:update', callback);
  return () => socket?.off('queue:update', callback);
}

export function offAll() {
  socket?.removeAllListeners();
}
