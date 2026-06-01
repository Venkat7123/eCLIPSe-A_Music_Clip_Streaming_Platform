const DB_NAME = 'eclipse-offline';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function downloadTrack(track, authProfile, playlistMeta = null) {
  let audioBlob;

  if (track.audioFile && track.audioFile.startsWith('http')) {
    // Cloudinary URL — fetch directly
    const resp = await fetch(track.audioFile);
    if (!resp.ok) throw new Error('Failed to download audio file');
    audioBlob = await resp.blob();
  } else if (track.audioFile) {
    // Backend stream — fetch with auth
    const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';
    const streamUrl = `${BACKEND_URL.replace('/api', '')}/api/stream/${track.id}`;
    const resp = await fetch(streamUrl, {
      headers: authProfile?.token ? { Authorization: `Bearer ${authProfile.token}` } : {},
    });
    if (!resp.ok) throw new Error('Failed to download audio from server');
    audioBlob = await resp.blob();
  } else {
    throw new Error('Track has no audio file to download');
  }

  // Fetch artwork as blob
  let artworkBlob = null;
  if (track.artwork && track.artwork.startsWith('http')) {
    try {
      const artResp = await fetch(track.artwork);
      if (artResp.ok) artworkBlob = await artResp.blob();
    } catch (_) { /* ignore artwork failures */ }
  }

  const record = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.duration,
    audioFile: track.audioFile || null,
    audioBlob,
    artworkBlob,
    artworkUrl: track.artwork,
    downloadedAt: Date.now(),
    size: audioBlob.size + (artworkBlob ? artworkBlob.size : 0),
    ...(playlistMeta ? { playlistId: playlistMeta.id, playlistName: playlistMeta.name } : {}),
  };

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(record);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();

  return record;
}

export async function getDownloadedTrack(trackId) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const request = tx.objectStore(STORE_NAME).get(trackId);
  const result = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

export async function removeDownload(trackId) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(trackId);
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getAllDownloads() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const request = tx.objectStore(STORE_NAME).getAll();
  const result = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

export async function getDownloadedTrackIds() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const request = tx.objectStore(STORE_NAME).getAllKeys();
  const result = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return new Set(result);
}

export async function getDownloadSize() {
  const all = await getAllDownloads();
  return all.reduce((sum, d) => sum + (d.size || 0), 0);
}

export function getArtworkUrl(record) {
  if (record.artworkBlob) {
    return URL.createObjectURL(record.artworkBlob);
  }
  return record.artworkUrl || '/uploads/artwork/lofi_sunset.png';
}

export function getAudioUrl(record) {
  return URL.createObjectURL(record.audioBlob);
}

export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
