import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createClipSchema, updateClipSchema, getClipSchema, deleteClipSchema } from '../schemas/clipSchemas.js';
import * as clipService from '../services/clipService.js';

const router = Router();

// GET /api/clips — list current user's clips
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const clips = await clipService.getUserClips(req.user.uid);
    res.json({ clips });
  } catch (err) {
    next(err);
  }
});

// GET /api/clips/:id — get single clip
router.get('/:id', authenticateToken, validate(getClipSchema), async (req, res, next) => {
  try {
    const clip = await clipService.getClipById(req.validated.params.id);
    if (!clip) return res.status(404).json({ error: 'Clip not found' });
    res.json({ clip });
  } catch (err) {
    next(err);
  }
});

// POST /api/clips — create new clip
router.post('/', authenticateToken, validate(createClipSchema), async (req, res, next) => {
  try {
    const { trackId, name, start, end } = req.validated.body;
    const clip = await clipService.createClip({
      trackId,
      userId: req.user.uid,
      name,
      start,
      end,
    });
    res.status(201).json({ clip });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/clips/:id — update clip
router.patch('/:id', authenticateToken, validate(updateClipSchema), async (req, res, next) => {
  try {
    const { name, start, end } = req.validated.body;
    const result = await clipService.updateClip(req.validated.params.id, req.user.uid, { name, start, end });
    if (!result) return res.status(404).json({ error: 'Clip not found' });
    if (result.forbidden) return res.status(403).json({ error: 'Access denied' });
    res.json({ clip: result });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/clips/:id — delete clip
router.delete('/:id', authenticateToken, validate(deleteClipSchema), async (req, res, next) => {
  try {
    const result = await clipService.deleteClip(req.validated.params.id, req.user.uid);
    if (!result) return res.status(404).json({ error: 'Clip not found' });
    if (result.forbidden) return res.status(403).json({ error: 'Access denied' });
    res.json({ message: 'Clip deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
