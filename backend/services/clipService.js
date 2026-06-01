import Clip from '../models/Clip.js';

export async function getUserClips(userId) {
  return Clip.find({ userId }).sort({ createdAt: -1 });
}

export async function getClipById(clipId) {
  return Clip.findById(clipId);
}

export async function createClip({ trackId, userId, name, start, end }) {
  const clip = await Clip.create({
    trackId,
    userId,
    name: name || 'My Clip',
    start,
    end,
    duration: end - start,
  });
  return clip;
}

export async function updateClip(clipId, userId, { name, start, end }) {
  const clip = await Clip.findById(clipId);
  if (!clip) return null;
  if (clip.userId !== userId) return { forbidden: true };

  if (name !== undefined) clip.name = name;
  if (start !== undefined) clip.start = start;
  if (end !== undefined) clip.end = end;
  clip.duration = clip.end - clip.start;

  await clip.save();
  return clip;
}

export async function deleteClip(clipId, userId) {
  const clip = await Clip.findById(clipId);
  if (!clip) return null;
  if (clip.userId !== userId) return { forbidden: true };

  await Clip.deleteOne({ _id: clipId });
  return clip;
}
