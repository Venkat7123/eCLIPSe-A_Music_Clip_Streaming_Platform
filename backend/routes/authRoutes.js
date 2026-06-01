import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getOrCreateUser } from '../services/authService.js';

const router = Router();

// POST /api/login — verify token, upsert user, return profile
router.post('/login', authenticateToken, async (req, res, next) => {
  try {
    const user = await getOrCreateUser(req.user);

    console.log(`[AUTH] User ${user.name} logged in successfully`);

    res.status(200).json({
      success: true,
      message: 'Authentication token verified successfully on backend login.',
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        isSimulated: req.user.isSimulated || false,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
