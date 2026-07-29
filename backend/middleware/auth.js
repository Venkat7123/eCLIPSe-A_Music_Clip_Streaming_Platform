import admin, { isFirebaseAdminConfigured } from '../config/firebase.js';
import User from '../models/User.js';

// Simulated token prefix (matches frontend's simulated JWT)
const SIMULATED_TOKEN_PREFIX = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJlQ0xJUHNlX0ZpcmViYXNl';

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access Denied. Authorization ID Token missing.' });
  }

  // Simulated token bypass (development or when Firebase Admin is not configured)
  if ((process.env.NODE_ENV === 'development' || !isFirebaseAdminConfigured()) && (token.startsWith(SIMULATED_TOKEN_PREFIX) || token.includes('sim_'))) {
    req.user = {
      uid: 'sim_firebase_uid_42',
      email: 'music.lover@entra.microsoft.com',
      name: 'Entra Music Lover',
      role: 'ADMIN',
      isSimulated: true,
    };
    return next();
  }

  // Real Firebase token verification
  if (!isFirebaseAdminConfigured()) {
    return res.status(503).json({ error: 'Firebase Admin not configured' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    // Look up or create user in MongoDB
    let user = await User.findOne({ uid: decoded.uid });
    if (!user) {
      user = await User.create({
        uid: decoded.uid,
        email: decoded.email || '',
        name: decoded.name || decoded.email?.split('@')[0] || '',
        photoURL: decoded.picture || null,
      });
    } else {
      // Update last login
      user.lastLoginAt = new Date();
      await user.save();
    }

    req.user = {
      uid: user.uid,
      email: user.email,
      name: user.name,
      role: user.role,
      isSimulated: false,
    };
    next();
  } catch (err) {
    console.error('[AUTH] Token verification failed:', err.message);
    return res.status(403).json({ error: 'Forbidden. Authorization Token expired or invalid.' });
  }
}
