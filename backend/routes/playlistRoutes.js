import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createPlaylistSchema,
  updatePlaylistSchema,
  addTrackSchema,
  removeTrackSchema,
  reorderSchema,
  getPlaylistSchema,
} from '../schemas/playlistSchemas.js';
import * as playlistService from '../services/playlistService.js';
import { emitPlaylistTrackAdded, emitPlaylistTrackRemoved, emitPlaylistReordered } from '../socket/index.js';

const router = Router();

// All playlist routes require auth
router.use(authenticateToken);

// GET /api/playlists — user's playlists
router.get('/', async (req, res, next) => {
  try {
    const playlists = await playlistService.getUserPlaylists(req.user.uid);
    res.json({ playlists });
  } catch (err) {
    next(err);
  }
});

// GET /api/playlists/:id — single playlist
router.get('/:id', validate(getPlaylistSchema), async (req, res, next) => {
  try {
    const result = await playlistService.getPlaylistById(req.validated.params.id, req.user.uid);
    if (!result) return res.status(404).json({ error: 'Playlist not found' });
    if (result.forbidden) return res.status(403).json({ error: 'Access denied' });
    res.json({ playlist: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/playlists — create playlist
router.post('/', validate(createPlaylistSchema), async (req, res, next) => {
  try {
    const { name, description, initialTrackId, clip } = req.validated.body;
    const playlist = await playlistService.createPlaylist({
      name,
      description,
      creator: req.user.uid,
      initialTrackId,
      clip,
    });
    res.status(201).json({ playlist });
  } catch (err) {
    next(err);
  }
});

// PUT /api/playlists/:id — update metadata
router.put('/:id', validate(updatePlaylistSchema), async (req, res, next) => {
  try {
    const result = await playlistService.updatePlaylist(
      req.validated.params.id,
      req.user.uid,
      req.validated.body
    );
    if (!result) return res.status(404).json({ error: 'Playlist not found' });
    if (result.forbidden) return res.status(403).json({ error: 'Access denied' });
    res.json({ playlist: result });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/playlists/:id
router.delete('/:id', validate(getPlaylistSchema), async (req, res, next) => {
  try {
    const result = await playlistService.deletePlaylist(req.validated.params.id, req.user.uid);
    if (!result) return res.status(404).json({ error: 'Playlist not found' });
    if (result.forbidden) return res.status(403).json({ error: 'Access denied' });
    res.json({ success: true, message: 'Playlist deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/playlists/:id/tracks — add track with optional clip
router.post('/:id/tracks', validate(addTrackSchema), async (req, res, next) => {
  try {
    const { trackId, clip, clipId } = req.validated.body;
    const result = await playlistService.addTrackToPlaylist(
      req.validated.params.id,
      req.user.uid,
      { trackId, clip, clipId }
    );
    if (!result) return res.status(404).json({ error: 'Playlist not found' });
    if (result.forbidden) return res.status(403).json({ error: 'Access denied' });
    if (result.notFound) return res.status(404).json({ error: 'Track not found' });

    // Emit real-time event
    emitPlaylistTrackAdded(req.validated.params.id, result.addedTrack);

    res.status(201).json({ playlist: result.playlist });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/playlists/:id/tracks/:trackId — remove track
router.delete('/:id/tracks/:trackId', validate(removeTrackSchema), async (req, res, next) => {
  try {
    const entryId = req.query.entryId || null;
    const result = await playlistService.removeTrackFromPlaylist(
      req.validated.params.id,
      req.user.uid,
      req.validated.params.trackId,
      entryId
    );
    if (!result) return res.status(404).json({ error: 'Playlist not found' });
    if (result.forbidden) return res.status(403).json({ error: 'Access denied' });
    if (result.notFound) return res.status(404).json({ error: 'Track not in playlist' });

    // Emit real-time event
    emitPlaylistTrackRemoved(req.validated.params.id, req.validated.params.trackId);

    res.json({ playlist: result });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/playlists/:id/tracks/:entryId/clip — update clip in playlist
router.patch('/:id/tracks/:entryId/clip', async (req, res, next) => {
  try {
    const { name, start, end } = req.body;
    const playlistId = req.params.id;
    const entryId = req.params.entryId;
    const result = await playlistService.updateClipInPlaylist(
      playlistId,
      req.user.uid,
      entryId,
      { name, start, end }
    );
    if (!result) return res.status(404).json({ error: 'Playlist not found' });
    if (result.forbidden) return res.status(403).json({ error: 'Access denied' });
    if (result.notFound) return res.status(404).json({ error: 'Entry not found in playlist' });
    res.json({ playlist: result });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/playlists/:id/reorder — reorder tracks
router.patch('/:id/reorder', validate(reorderSchema), async (req, res, next) => {
  try {
    const { entryIds } = req.validated.body;
    const result = await playlistService.reorderTracks(
      req.validated.params.id,
      req.user.uid,
      entryIds
    );
    if (!result) return res.status(404).json({ error: 'Playlist not found' });
    if (result.forbidden) return res.status(403).json({ error: 'Access denied' });

    // Emit real-time event
    const trackIds = result.tracks.map(t => typeof t.trackId === 'object' ? t.trackId._id : t.trackId);
    emitPlaylistReordered(req.validated.params.id, trackIds);

    res.json({ playlist: result });
  } catch (err) {
    next(err);
  }
});

export default router;
