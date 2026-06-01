import fs from 'fs';
import path from 'path';
import Track from '../models/Track.js';

const UPLOADS_DIR = path.resolve('uploads');

export async function streamTrack(trackId, rangeHeader, res) {
  const track = await Track.findById(trackId);
  if (!track) return { error: 404, message: 'Track not found' };

  // Cloudinary URL — redirect (Cloudinary handles range requests natively)
  if (track.audioFile && track.audioFile.startsWith('http')) {
    res.redirect(302, track.audioFile);
    return { success: true };
  }

  // Local file
  const filePath = path.join(UPLOADS_DIR, track.audioFile);

  let stat;
  try {
    stat = await fs.promises.stat(filePath);
  } catch {
    return { error: 404, message: 'Audio file not found' };
  }

  const fileSize = stat.size;
  const contentType = track.mimeType || 'audio/mpeg';

  if (!rangeHeader) {
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': fileSize,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
    return { success: true };
  }

  // Parse Range header: bytes=start-end
  const parts = rangeHeader.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

  if (start >= fileSize || end >= fileSize || start > end) {
    res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
    return { error: 416, message: 'Range not satisfiable' };
  }

  const chunkSize = end - start + 1;

  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunkSize,
    'Content-Type': contentType,
  });

  fs.createReadStream(filePath, { start, end }).pipe(res);
  return { success: true };
}
