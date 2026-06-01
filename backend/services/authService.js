import User from '../models/User.js';

export async function getOrCreateUser(firebaseUser) {
  let user = await User.findOne({ uid: firebaseUser.uid });

  if (!user) {
    user = await User.create({
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.name || firebaseUser.email?.split('@')[0] || '',
      photoURL: firebaseUser.photoURL || null,
      avatarColor: firebaseUser.avatarColor || '#a855f7',
      bio: firebaseUser.bio || '',
    });
  } else {
    user.lastLoginAt = new Date();
    await user.save();
  }

  return user;
}

export async function getUserProfile(uid) {
  return User.findOne({ uid });
}
