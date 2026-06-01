import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import PlaylistCover from '../models/PlaylistCover.js';

const router = Router();

// GET /api/covers — fetch all preset playlist covers (authenticated users)
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const covers = await PlaylistCover.find().sort({ order: 1, createdAt: 1 });
    res.json({ covers });
  } catch (err) {
    next(err);
  }
});

// POST /api/covers — add a new preset cover (admin only in production; open for now)
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const { name, url, cloudinaryPublicId, tags, order } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: 'name and url are required' });
    }
    const cover = await PlaylistCover.create({ name, url, cloudinaryPublicId, tags, order });
    res.status(201).json({ cover });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/covers/:id — remove a preset cover
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    await PlaylistCover.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
