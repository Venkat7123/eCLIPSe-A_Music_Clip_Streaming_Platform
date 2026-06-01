import User from '../models/User.js';

export async function getAllUsers() {
  return User.find({}).sort({ createdAt: -1 });
}

export async function getProfile(uid) {
  return User.findOne({ uid });
}

export async function updateProfile(uid, updates) {
  return User.findOneAndUpdate(
    { uid },
    { $set: updates },
    { new: true, runValidators: true }
  );
}

export async function updateRole(uid, role) {
  return User.findOneAndUpdate(
    { uid },
    { $set: { role } },
    { new: true }
  );
}

export async function savePlaybackState(uid, playbackState) {
  return User.findOneAndUpdate(
    { uid },
    { $set: { playbackState: { ...playbackState, updatedAt: new Date() } } },
    { new: true }
  );
}

export async function getPlaybackState(uid) {
  const user = await User.findOne({ uid }, { playbackState: 1 });
  return user?.playbackState || null;
}
