import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { streamTrack } from '../services/streamService.js';

const router = Router();

// GET /api/stream/:trackId — HTTP Range streaming (auth required)
router.get('/:trackId', authenticateToken, async (req, res, next) => {
  try {
    const result = await streamTrack(req.params.trackId, req.headers.range, res);
    if (result.error) {
      return res.status(result.error).json({ error: result.message });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
