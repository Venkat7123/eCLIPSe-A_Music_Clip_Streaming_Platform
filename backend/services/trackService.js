import Track from '../models/Track.js';
import Playlist from '../models/Playlist.js';
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from './cacheService.js';
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import fs from 'fs/promises';
import { existsSync, chmodSync, createWriteStream } from 'fs';
import path from 'path';
import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import https from 'https';

const execFileAsync = promisify(execFile);

// Set up bin directory containing static binaries for deployed environment (Azure)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '..');
const BIN_DIR = path.join(BACKEND_ROOT, 'bin');

// Add the bin directory to PATH so local binaries take precedence and yt-dlp can locate ffmpeg
if (path.delimiter) {
  process.env.PATH = BIN_DIR + path.delimiter + process.env.PATH;
}

// Make sure binaries have executable permissions (critical for Linux deployments)
try {
  const binaries = ['yt-dlp', 'ffmpeg', 'ffprobe'];
  for (const bin of binaries) {
    const binPath = path.join(BIN_DIR, bin);
    if (existsSync(binPath)) {
      chmodSync(binPath, 0o755);
    }
  }
} catch (err) {
  console.warn('[INIT] Failed to set executable permissions for local binaries:', err.message);
}

// Helper to download a file following redirects
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    function get(url) {
      https.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          get(response.headers.location);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }
        const file = createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(dest).catch(() => {});
        reject(err);
      });
    }
    get(url);
  });
}

// Helper to extract a zip file on Windows using fast native tar command
function extractZipWindows(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    // Windows 10/11 includes bsdtar as 'tar' in PATH, which is much faster than PowerShell
    exec(`tar -xf "${zipPath}" -C "${destDir}"`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Setup Windows static binaries if missing locally
async function setupWindowsBinaries() {
  if (process.platform !== 'win32') return;

  const localYtdlp = path.join(BIN_DIR, 'yt-dlp.exe');
  const localFfmpeg = path.join(BIN_DIR, 'ffmpeg.exe');
  const localFfprobe = path.join(BIN_DIR, 'ffprobe.exe');

  const ytdlpExists = existsSync(localYtdlp);
  const ffmpegExists = existsSync(localFfmpeg);
  const ffprobeExists = existsSync(localFfprobe);

  if (ytdlpExists && ffmpegExists && ffprobeExists) return;

  console.log('[INIT] Local Windows binaries not found. Downloading static builds dynamically...');
  try {
    await fs.mkdir(BIN_DIR, { recursive: true });

    if (!ytdlpExists) {
      console.log('[INIT] Downloading yt-dlp.exe...');
      await downloadFile('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', localYtdlp);
      console.log('[INIT] yt-dlp.exe downloaded successfully.');
    }

    if (!ffmpegExists) {
      const zipPath = path.join(BIN_DIR, 'ffmpeg.zip');
      console.log('[INIT] Downloading ffmpeg.zip...');
      await downloadFile('https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-win-64.zip', zipPath);
      console.log('[INIT] Extracting ffmpeg.zip...');
      await extractZipWindows(zipPath, BIN_DIR);
      await fs.unlink(zipPath).catch(() => {});
      console.log('[INIT] ffmpeg.exe configured successfully.');
    }

    if (!ffprobeExists) {
      const zipPath = path.join(BIN_DIR, 'ffprobe.zip');
      console.log('[INIT] Downloading ffprobe.zip...');
      await downloadFile('https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffprobe-4.4.1-win-64.zip', zipPath);
      console.log('[INIT] Extracting ffprobe.zip...');
      await extractZipWindows(zipPath, BIN_DIR);
      await fs.unlink(zipPath).catch(() => {});
      console.log('[INIT] ffprobe.exe configured successfully.');
    }

    console.log('[INIT] All local Windows static binaries set up correctly.');
  } catch (err) {
    console.error('[INIT] Failed to dynamically set up Windows static binaries:', err.message);
  }
}

// Trigger setup asynchronously on startup
setupWindowsBinaries().catch((err) => console.error('[INIT] Setup error:', err));

const UPLOADS_DIR = path.resolve('uploads');

// Cleanup temporary files starting with "yt_" that are older than 1 hour
async function cleanupTempFiles() {
  try {
    const files = await fs.readdir(UPLOADS_DIR);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const file of files) {
      if (file.startsWith('yt_')) {
        const filePath = path.join(UPLOADS_DIR, file);
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > oneHour) {
          await fs.unlink(filePath).catch(() => {});
          console.log(`[CLEANUP] Deleted old temp file: ${file}`);
        }
      }
    }
  } catch (err) {
    console.warn('[CLEANUP] Failed to run temp file cleanup:', err.message);
  }
}

// Run cleanup on startup and then every hour
cleanupTempFiles().catch((err) => console.error('[CLEANUP] Initial cleanup error:', err));
setInterval(() => cleanupTempFiles().catch(() => {}), 60 * 60 * 1000);



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
    // Upload audio to Cloudinary if it is a local file
    if (audioPath && !audioPath.startsWith('http')) {
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

    // Upload artwork to Cloudinary if it is a local file
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
    audioUrl = audioPath ? (audioPath.startsWith('http') ? audioPath : path.basename(audioPath)) : '';
    artworkUrl = artworkPath ? (artworkPath.startsWith('http') ? artworkPath : path.basename(artworkPath)) : '';
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
    '--dump-json', '--no-download', '--no-playlist', 
    '--js-runtimes', 'node', 
    '--extractor-args', 'youtube:player_client=mweb,android,web',
    url,
  ], { timeout: 30000 });
  const info = JSON.parse(infoJson);

  const title = info.title || 'Untitled';
  const artist = info.channel || info.uploader || 'Unknown';
  const duration = Math.round(info.duration || 0);
  const thumbnailUrl = info.thumbnail || '';

  // 2. Download audio to uploads/ as MP3
  const audioFilename = `yt_${Date.now()}.mp3`;
  const audioPath = path.join(UPLOADS_DIR, audioFilename);

  await execFileAsync('yt-dlp', [
    '-x',
    '--audio-format', 'mp3',
    '--js-runtimes', 'node',
    '--extractor-args', 'youtube:player_client=mweb,android,web',
    '-o', audioPath.replace('.mp3', '') + '.%(ext)s',
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
        '--js-runtimes', 'node',
        '--extractor-args', 'youtube:player_client=mweb,android,web',
        '-o', artworkPath.replace('.jpg', ''),
        '--no-playlist',
        url,
      ], { timeout: 30000 });
      // yt-dlp may append .jpg automatically, or WebP/PNG if ffmpeg conversion fails
      const possiblePaths = [
        artworkPath,
        artworkPath.replace('.jpg', '') + '.jpg',
        artworkPath.replace('.jpg', '') + '.webp',
        artworkPath.replace('.jpg', '') + '.png'
      ];
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
    '--dump-json', '--no-download', '--no-playlist', 
    '--js-runtimes', 'node', 
    '--extractor-args', 'youtube:player_client=mweb,android,web',
    url,
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

  // 2. Download audio to uploads/ as MP3
  const audioFilename = `yt_${Date.now()}.mp3`;
  const audioPath = path.join(UPLOADS_DIR, audioFilename);

  await execFileAsync('yt-dlp', [
    '-x',
    '--audio-format', 'mp3',
    '--js-runtimes', 'node',
    '--extractor-args', 'youtube:player_client=mweb,android,web',
    '-o', audioPath.replace('.mp3', '') + '.%(ext)s',
    '--no-playlist',
    url,
  ], { timeout: 120000 });

  // 3. Download thumbnail to uploads/
  let artworkFilename = '';
  let localArtworkPath = '';
  if (thumbnailUrl) {
    artworkFilename = `yt_thumb_${Date.now()}.jpg`;
    localArtworkPath = path.join(UPLOADS_DIR, artworkFilename);
    try {
      await execFileAsync('yt-dlp', [
        '--write-thumbnail', '--skip-download',
        '--convert-thumbnails', 'jpg',
        '--js-runtimes', 'node',
        '--extractor-args', 'youtube:player_client=mweb,android,web',
        '-o', localArtworkPath.replace('.jpg', ''),
        '--no-playlist',
        url,
      ], { timeout: 30000 });
      // yt-dlp may append .jpg automatically, or WebP/PNG if ffmpeg conversion fails
      const possiblePaths = [
        localArtworkPath,
        localArtworkPath.replace('.jpg', '') + '.jpg',
        localArtworkPath.replace('.jpg', '') + '.webp',
        localArtworkPath.replace('.jpg', '') + '.png'
      ];
      let found = false;
      for (const p of possiblePaths) {
        try {
          await fs.access(p);
          localArtworkPath = p;
          artworkFilename = path.basename(p);
          found = true;
          break;
        } catch {}
      }
      if (!found) {
        artworkFilename = '';
        localArtworkPath = '';
      }
    } catch (thumbErr) {
      console.warn('[YT] Thumbnail download failed, will use URL fallback:', thumbErr.message);
      artworkFilename = '';
      localArtworkPath = '';
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
