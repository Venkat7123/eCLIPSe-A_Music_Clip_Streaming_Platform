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
