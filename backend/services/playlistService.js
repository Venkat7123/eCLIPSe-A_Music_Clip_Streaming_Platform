import Playlist from '../models/Playlist.js';
import Track from '../models/Track.js';
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from './cacheService.js';

export async function getUserPlaylists(uid) {
  const cacheKey = `playlists:${uid}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const playlists = await Playlist.find({ creator: uid }).sort({ updatedAt: -1 });
  await cacheSet(cacheKey, playlists);
  return playlists;
}

export async function getPlaylistById(id, uid) {
  const playlist = await Playlist.findById(id).populate('tracks.trackId');
  if (!playlist) return null;

  // Verify ownership
  if (playlist.creator !== uid) {
    return { forbidden: true };
  }

  return playlist;
}

export async function createPlaylist({ name, description, creator, initialTrackId, clip }) {
  const tracks = [];

  if (initialTrackId) {
    tracks.push({
      trackId: initialTrackId,
      order: 0,
      clip: clip
        ? {
            name: clip.name || '',
            start: clip.start,
            end: clip.end,
            duration: clip.end - clip.start,
          }
        : null,
    });
  }

  const playlist = await Playlist.create({
    name,
    description: description || '',
    creator,
    tracks,
  });

  await cacheDel(`playlists:${creator}`);
  return playlist;
}

export async function updatePlaylist(id, uid, updates) {
  const playlist = await Playlist.findById(id);
  if (!playlist) return null;
  if (playlist.creator !== uid) return { forbidden: true };

  if (updates.name !== undefined) playlist.name = updates.name;
  if (updates.description !== undefined) playlist.description = updates.description;
  if (updates.artwork !== undefined) playlist.artwork = updates.artwork;

  await playlist.save();
  await cacheDel(`playlists:${uid}`);
  return playlist;
}

export async function deletePlaylist(id, uid) {
  const playlist = await Playlist.findById(id);
  if (!playlist) return null;
  if (playlist.creator !== uid) return { forbidden: true };

  await Playlist.findByIdAndDelete(id);
  await cacheDel(`playlists:${uid}`);
  return playlist;
}

export async function addTrackToPlaylist(playlistId, uid, { trackId, clip, clipId }) {
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) return null;
  if (playlist.creator !== uid) return { forbidden: true };

  // Verify track exists
  const track = await Track.findById(trackId);
  if (!track) return { notFound: true };

  // If clipId provided, fetch clip data from Clip model
  let clipData = clip || null;
  if (clipId && !clipData) {
    const Clip = (await import('../models/Clip.js')).default;
    const clipDoc = await Clip.findById(clipId);
    if (clipDoc) {
      clipData = {
        name: clipDoc.name,
        start: clipDoc.start,
        end: clipDoc.end,
        duration: clipDoc.duration,
      };
    }
  }

  const order = playlist.tracks.length;
  const trackEntry = {
    trackId,
    order,
    clip: clipData
      ? {
          name: clipData.name || '',
          start: clipData.start,
          end: clipData.end,
          duration: clipData.end - clipData.start,
        }
      : null,
    clipId: clipId || null,
  };

  playlist.tracks.push(trackEntry);
  await playlist.save();
  await cacheDel(`playlists:${uid}`);

  return { playlist, addedTrack: track };
}

export async function removeTrackFromPlaylist(playlistId, uid, trackId, entryId) {
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) return null;
  if (playlist.creator !== uid) return { forbidden: true };

  let trackIndex;
  if (entryId) {
    if (entryId.startsWith('legacy_')) {
      // Legacy entry without _id — find by index
      trackIndex = parseInt(entryId.split('_').pop(), 10);
    } else {
      // Remove specific entry by subdocument _id
      trackIndex = playlist.tracks.findIndex(
        (t) => t._id && t._id.toString() === entryId
      );
    }
  } else {
    // Fallback: remove first match by trackId
    trackIndex = playlist.tracks.findIndex(
      (t) => t.trackId.toString() === trackId
    );
  }
  if (trackIndex === -1) return { notFound: true };

  playlist.tracks.splice(trackIndex, 1);

  // Reorder remaining tracks
  playlist.tracks.forEach((t, i) => {
    t.order = i;
  });

  await playlist.save();
  await cacheDel(`playlists:${uid}`);
  return playlist;
}

export async function updateClipInPlaylist(playlistId, uid, entryId, clip) {
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) return null;
  if (playlist.creator !== uid) return { forbidden: true };

  const clipData = {
    name: clip.name || '',
    start: clip.start,
    end: clip.end,
    duration: clip.end - clip.start,
  };

  if (entryId.startsWith('legacy_')) {
    // Legacy entry without _id — update by positional index using direct $set
    const idx = parseInt(entryId.split('_').pop(), 10);
    if (idx < 0 || idx >= playlist.tracks.length) return { notFound: true };

    await Playlist.updateOne(
      { _id: playlistId },
      { $set: { [`tracks.${idx}.clip`]: clipData } }
    );
  } else {
    // Normal entry — update by subdocument _id using arrayFilters
    const result = await Playlist.updateOne(
      { _id: playlistId, 'tracks._id': entryId },
      { $set: { 'tracks.$[entry].clip': clipData } },
      { arrayFilters: [{ 'entry._id': entryId }] }
    );
    if (result.matchedCount === 0) return { notFound: true };
  }

  await cacheDel(`playlists:${uid}`);

  // Return the updated playlist
  const updated = await Playlist.findById(playlistId);
  return updated;
}

export async function reorderTracks(playlistId, uid, entryIds) {
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) return null;
  if (playlist.creator !== uid) return { forbidden: true };

  // Build map by entryId (subdocument _id)
  const entryMap = new Map();
  playlist.tracks.forEach((t) => {
    entryMap.set(t._id.toString(), t);
  });

  const reordered = [];
  for (let i = 0; i < entryIds.length; i++) {
    const entry = entryMap.get(entryIds[i]);
    if (entry) {
      entry.order = i;
      reordered.push(entry);
    }
  }

  playlist.tracks = reordered;
  await playlist.save();
  await cacheDel(`playlists:${uid}`);
  return playlist;
}
