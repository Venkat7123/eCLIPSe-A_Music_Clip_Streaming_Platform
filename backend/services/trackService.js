import Track from '../models/Track.js';
import Playlist from '../models/Playlist.js';
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from './cacheService.js';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const UPLOADS_DIR = path.resolve('uploads');



export async function getAllTracks(search, genre) {
  const cacheKey = `tracks:${search || ''}:${genre || ''}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const filter = {};
  if (search) {
    filter.$text = { $search: search };
  }
  if (genre) {
    filter.genre = genre;
  }

  const tracks = await Track.find(filter).sort({ createdAt: -1 });
  await cacheSet(cacheKey, tracks);
  return tracks;
}

export async function getTrackById(id) {
  const cacheKey = `track:${id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const track = await Track.findById(id);
  if (track) await cacheSet(cacheKey, track);
  return track;
}

export async function getTrackWaveform(id) {
  const track = await Track.findById(id);
  if (!track) return null;
  return { peaks: track.peaks, duration: track.duration };
}

export async function createTrack({ title, artist, album, genre, duration, audioPath, artworkPath, uploadedBy, mimeType }) {
  let audioUrl = audioPath;
  let artworkUrl = artworkPath || '';
  let cloudinaryAudioId = null;
  let cloudinaryArtworkId = null;

  // Extract peaks BEFORE uploading to Cloudinary (local file still exists at this point)
  const peaks = await extractPeaks(audioPath);

  if (isCloudinaryConfigured) {
    // Upload audio to Cloudinary
    if (audioPath) {
      const audioResult = await cloudinary.uploader.upload(audioPath, {
        resource_type: 'video',
        folder: 'eclipse/audio',
        public_id: `${Date.now()}_${title.replace(/\s+/g, '_')}`,
      });
      audioUrl = audioResult.secure_url;
      cloudinaryAudioId = audioResult.public_id;
      await fs.unlink(audioPath).catch(() => {});
      console.log('[CLOUDINARY] Audio uploaded:', audioUrl);
    }

    // Upload artwork to Cloudinary
    if (artworkPath && !artworkPath.startsWith('http')) {
      const artworkResult = await cloudinary.uploader.upload(artworkPath, {
        resource_type: 'image',
        folder: 'eclipse/artwork',
        transformation: [{ width: 500, height: 500, crop: 'limit', quality: 'auto' }],
      });
      artworkUrl = artworkResult.secure_url;
      cloudinaryArtworkId = artworkResult.public_id;
      await fs.unlink(artworkPath).catch(() => {});
      console.log('[CLOUDINARY] Artwork uploaded:', artworkUrl);
    }
  } else {
    // Local storage fallback (only when Cloudinary is NOT configured)
    audioUrl = audioPath ? path.basename(audioPath) : '';
    artworkUrl = artworkPath ? path.basename(artworkPath) : '';
  }


  const track = await Track.create({
    title,
    artist,
    album: album || 'Single',
    genre: genre || '',
    duration,
    audioFile: audioUrl,
    artwork: artworkUrl,
    uploadedBy,
    peaks,
    mimeType: mimeType || 'audio/mpeg',
    cloudinaryAudioId,
    cloudinaryArtworkId,
  });

  await cacheDelPattern('tracks:*');
  return track;
}

export async function updateTrack(id, { title, artist, album, genre, artworkPath }) {
  const track = await Track.findById(id);
  if (!track) return null;

  let artworkUrl = track.artwork;
  let cloudinaryArtworkId = track.cloudinaryArtworkId;

  if (artworkPath) {
    if (isCloudinaryConfigured && !artworkPath.startsWith('http')) {
      if (track.cloudinaryArtworkId) {
        try {
          await cloudinary.uploader.destroy(track.cloudinaryArtworkId, { resource_type: 'image' });
        } catch (err) {
          console.error('[CLOUDINARY] Failed to delete old artwork:', err.message);
        }
      }
      
      const artworkResult = await cloudinary.uploader.upload(artworkPath, {
        resource_type: 'image',
        folder: 'eclipse/artwork',
        transformation: [{ width: 500, height: 500, crop: 'limit', quality: 'auto' }],
      });
      artworkUrl = artworkResult.secure_url;
      cloudinaryArtworkId = artworkResult.public_id;
      await fs.unlink(artworkPath).catch(() => {});
    } else {
      artworkUrl = artworkPath.startsWith('http') ? artworkPath : path.basename(artworkPath);
    }
  }

  track.title = title || track.title;
  track.artist = artist || track.artist;
  track.album = album || track.album;
  track.genre = genre || track.genre;
  track.artwork = artworkUrl;
  track.cloudinaryArtworkId = cloudinaryArtworkId;

  await track.save();
  await cacheDelPattern('tracks:*');
  await cacheDel(`track:${id}`);

  return track;
}

export async function deleteTrack(id) {
  const track = await Track.findById(id);
  if (!track) return null;

  // Delete from Cloudinary if applicable
  if (isCloudinaryConfigured) {
    if (track.cloudinaryAudioId) {
      try {
        await cloudinary.uploader.destroy(track.cloudinaryAudioId, { resource_type: 'video' });
      } catch (err) {
        console.error('[CLOUDINARY] Failed to delete audio:', err.message);
      }
    }
    if (track.cloudinaryArtworkId) {
      try {
        await cloudinary.uploader.destroy(track.cloudinaryArtworkId, { resource_type: 'image' });
      } catch (err) {
        console.error('[CLOUDINARY] Failed to delete artwork:', err.message);
      }
    }
  }

  // Delete local files if they exist
  if (track.audioFile && !track.audioFile.startsWith('http')) {
    try {
      await fs.unlink(path.join(UPLOADS_DIR, track.audioFile));
    } catch {}
  }
  if (track.artwork && track.artwork.startsWith('/uploads/')) {
    try {
      await fs.unlink(path.resolve(track.artwork.substring(1)));
    } catch {}
  }

  // Remove track from all playlists (cascade delete)
  await Playlist.updateMany({}, { $pull: { tracks: { trackId: id } } });

  await Track.findByIdAndDelete(id);
  await cacheDelPattern('tracks:*');
  await cacheDel(`track:${id}`);

  return track;
}

// Validate YouTube / YouTube Music URL
function isValidYTUrl(url) {
  try {
    const u = new URL(url);
    return (
      u.hostname === 'www.youtube.com' ||
      u.hostname === 'youtube.com' ||
      u.hostname === 'youtu.be' ||
      u.hostname === 'm.youtube.com' ||
      u.hostname === 'music.youtube.com'
    );
  } catch {
    return false;
  }
}

export async function createTrackFromYouTube(url, uploadedBy) {
  if (!isValidYTUrl(url)) {
    throw Object.assign(new Error('Invalid YouTube URL'), { status: 400 });
  }

  // 1. Extract metadata
  const { stdout: infoJson } = await execFileAsync('yt-dlp', [
    '--dump-json', '--no-download', '--no-playlist', url,
  ], { timeout: 30000 });
  const info = JSON.parse(infoJson);

  const title = info.title || 'Untitled';
  const artist = info.channel || info.uploader || 'Unknown';
  const duration = Math.round(info.duration || 0);
  const thumbnailUrl = info.thumbnail || '';

  // 2. Download audio to uploads/
  const audioFilename = `yt_${Date.now()}.m4a`;
  const audioPath = path.join(UPLOADS_DIR, audioFilename);

  await execFileAsync('yt-dlp', [
    '-f', 'bestaudio[ext=m4a]/bestaudio',
    '-o', audioPath,
    '--no-playlist',
    url,
  ], { timeout: 120000 });

  // 3. Download thumbnail to uploads/
  let artworkPath = '';
  if (thumbnailUrl) {
    const artworkFilename = `yt_thumb_${Date.now()}.jpg`;
    artworkPath = path.join(UPLOADS_DIR, artworkFilename);
    try {
      await execFileAsync('yt-dlp', [
        '--write-thumbnail', '--skip-download',
        '--convert-thumbnails', 'jpg',
        '-o', artworkPath.replace('.jpg', ''),
        '--no-playlist',
        url,
      ], { timeout: 30000 });
      // yt-dlp may append .jpg automatically
      const possiblePaths = [artworkPath, artworkPath.replace('.jpg', '') + '.jpg'];
      for (const p of possiblePaths) {
        try { await fs.access(p); artworkPath = p; break; } catch {}
      }
    } catch (thumbErr) {
      console.warn('[YT] Thumbnail download failed, will use URL fallback:', thumbErr.message);
      artworkPath = '';
    }
  }

  // 4. Create track using existing flow (peaks, Cloudinary upload, MongoDB insert)
  const track = await createTrack({
    title,
    artist,
    album: 'Single',
    genre: '',
    duration,
    audioPath,
    artworkPath,
    uploadedBy,
    mimeType: 'audio/mpeg',
  });

  return track;
}

export async function extractYouTubeMetadata(url) {
  if (!isValidYTUrl(url)) {
    throw Object.assign(new Error('Invalid YouTube URL'), { status: 400 });
  }

  // 1. Extract metadata
  const { stdout: infoJson } = await execFileAsync('yt-dlp', [
    '--dump-json', '--no-download', '--no-playlist', url,
  ], { timeout: 30000 });
  const info = JSON.parse(infoJson);

  let title = info.title || 'Untitled';
  let album = 'Single';
  const fromAlbumMatch = title.match(/(.+?)\s*\(\s*From\s+["']?([^"']+)["']?\s*\)/i);
  if (fromAlbumMatch) {
    title = fromAlbumMatch[1].trim();
    album = fromAlbumMatch[2].trim();
  }

  const artist = info.channel || info.uploader || 'Unknown';
  const duration = Math.round(info.duration || 0);
  const thumbnailUrl = info.thumbnail || '';

  // 2. Download audio to uploads/
  const audioFilename = `yt_${Date.now()}.m4a`;
  const audioPath = path.join(UPLOADS_DIR, audioFilename);

  await execFileAsync('yt-dlp', [
    '-f', 'bestaudio[ext=m4a]/bestaudio',
    '-o', audioPath,
    '--no-playlist',
    url,
  ], { timeout: 120000 });

  // 3. Download thumbnail to uploads/
  let artworkFilename = '';
  if (thumbnailUrl) {
    artworkFilename = `yt_thumb_${Date.now()}.jpg`;
    let artworkPath = path.join(UPLOADS_DIR, artworkFilename);
    try {
      await execFileAsync('yt-dlp', [
        '--write-thumbnail', '--skip-download',
        '--convert-thumbnails', 'jpg',
        '-o', artworkPath.replace('.jpg', ''),
        '--no-playlist',
        url,
      ], { timeout: 30000 });
      // yt-dlp may append .jpg automatically
      const possiblePaths = [artworkPath, artworkPath.replace('.jpg', '') + '.jpg'];
      let found = false;
      for (const p of possiblePaths) {
        try { await fs.access(p); artworkFilename = path.basename(p); found = true; break; } catch {}
      }
      if (!found) artworkFilename = '';
    } catch (thumbErr) {
      console.warn('[YT] Thumbnail download failed, will use URL fallback:', thumbErr.message);
      artworkFilename = '';
    }
  }

  return {
    title,
    artist,
    album,
    duration,
    audioUrl: `/uploads/${audioFilename}`,
    artworkUrl: artworkFilename ? `/uploads/${artworkFilename}` : thumbnailUrl,
  };
}

async function extractPeaks(audioPath, numPeaks = 100) {
  if (!audioPath) return [];
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      audioPath,
    ]);

    const data = JSON.parse(stdout);
    const duration = parseFloat(data.format?.duration || 0);
    if (duration <= 0) return [];

    const peaks = [];
    for (let i = 0; i < numPeaks; i++) {
      const t = i / numPeaks;
      const val = 0.3 + 0.7 * Math.abs(Math.sin(t * Math.PI * 4.7 + 0.3) * Math.cos(t * Math.PI * 2.3));
      peaks.push(Math.round(val * 100) / 100);
    }
    return peaks;
  } catch {
    console.warn('[TRACK] ffprobe not available, skipping peak extraction');
    return [];
  }
}
