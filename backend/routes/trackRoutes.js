import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { validate } from '../middleware/validate.js';
import { uploadTrack } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { getTracksSchema, getTrackSchema, deleteTrackSchema } from '../schemas/trackSchemas.js';
import * as trackService from '../services/trackService.js';
import { emitPlaylistTrackRemoved } from '../socket/index.js';

const router = Router();

// GET /api/tracks — list all tracks
router.get('/', validate(getTracksSchema), async (req, res, next) => {
  try {
    const { search, genre } = req.validated.query;
    const tracks = await trackService.getAllTracks(search, genre);
    res.json({ tracks });
  } catch (err) {
    next(err);
  }
});

// GET /api/tracks/:id — get single track
router.get('/:id', validate(getTrackSchema), async (req, res, next) => {
  try {
    const track = await trackService.getTrackById(req.validated.params.id);
    if (!track) return res.status(404).json({ error: 'Track not found' });
    res.json({ track });
  } catch (err) {
    next(err);
  }
});

// GET /api/tracks/:id/waveform — get peak data for clip trimmer
router.get('/:id/waveform', validate(getTrackSchema), async (req, res, next) => {
  try {
    const data = await trackService.getTrackWaveform(req.validated.params.id);
    if (!data) return res.status(404).json({ error: 'Track not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/tracks — admin only, upload new track
router.post('/', authenticateToken, requireAdmin, uploadLimiter, (req, res, next) => {
  uploadTrack(req, res, async (err) => {
    if (err) return next(err);

    try {
      const { title, artist, album, genre, duration } = req.body;

      if (!title || !artist) {
        return res.status(400).json({ error: 'title and artist are required' });
      }

      const audioFile = req.files?.audio?.[0];
      if (!audioFile) {
        return res.status(400).json({ error: 'Audio file is required' });
      }

      const artworkFile = req.files?.artwork?.[0];

      const track = await trackService.createTrack({
        title,
        artist,
        album,
        genre,
        duration: parseFloat(duration) || 0,
        audioPath: audioFile.path,
        artworkPath: artworkFile ? artworkFile.path : '',
        uploadedBy: req.user.uid,
        mimeType: audioFile.mimetype,
      });

      res.status(201).json({ track });
    } catch (err) {
      next(err);
    }
  });
});

// DELETE /api/tracks/:id — admin only, delete track + cascade
router.delete('/:id', authenticateToken, requireAdmin, validate(deleteTrackSchema), async (req, res, next) => {
  try {
    const track = await trackService.deleteTrack(req.validated.params.id);
    if (!track) return res.status(404).json({ error: 'Track not found' });

    // Emit socket events for affected playlists
    emitPlaylistTrackRemoved(track._id.toString());

    res.json({ success: true, message: 'Track deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
