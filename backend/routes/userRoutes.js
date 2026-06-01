import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema, toggleRoleSchema } from '../schemas/userSchemas.js';
import * as userService from '../services/userService.js';

const router = Router();

// GET /api/user/all — list all users (admin only)
router.get('/all', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// GET /api/user/profile
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.user.uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/user/profile
router.put('/profile', authenticateToken, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user.uid, req.validated.body);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// GET /api/user/playback — get saved playback state
router.get('/playback', authenticateToken, async (req, res, next) => {
  try {
    const state = await userService.getPlaybackState(req.user.uid);
    res.json({ playbackState: state });
  } catch (err) {
    next(err);
  }
});

// PUT /api/user/playback — save playback state
router.put('/playback', authenticateToken, async (req, res, next) => {
  try {
    const { currentTrackId, currentTime, duration, queue, queueIndex } = req.body;
    await userService.savePlaybackState(req.user.uid, { currentTrackId, currentTime, duration, queue, queueIndex });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/user/role — dev-only, requires admin
router.patch('/role', authenticateToken, requireAdmin, validate(toggleRoleSchema), async (req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Role toggle is only available in development' });
  }
  try {
    const user = await userService.updateRole(req.user.uid, req.validated.body.role);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
