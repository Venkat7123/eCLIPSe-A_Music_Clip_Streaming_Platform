import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Track from '../models/Track.js';
import Playlist from '../models/Playlist.js';
import User from '../models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eclipse-db';

const SEEDED_TRACKS = [
  { title: 'Lo-Fi Sunset', artist: 'Dreamscape', album: 'Dreamscape', genre: 'Lo-Fi', duration: 165, audioFile: 'seed_lofi.mp3', artwork: '/uploads/artwork/lofi_sunset.png', uploadedBy: 'seed', mimeType: 'audio/mpeg' },
  { title: 'Neon Highway', artist: 'Synthwave Vibes', album: 'Synthwave Vibes', genre: 'Synthwave', duration: 210, audioFile: 'seed_synth.mp3', artwork: '/uploads/artwork/neon_highway.png', uploadedBy: 'seed', mimeType: 'audio/mpeg' },
  { title: 'Deep Focus', artist: 'Mindful Audio', album: 'Deep Focus', genre: 'Ambient', duration: 260, audioFile: 'seed_ambient.mp3', artwork: '/uploads/artwork/deep_focus.png', uploadedBy: 'seed', mimeType: 'audio/mpeg' },
  { title: 'Acoustic Breeze', artist: 'Wild Harmonics', album: 'Acoustic Sessions', genre: 'Acoustic', duration: 195, audioFile: 'seed_acoustic.mp3', artwork: '/uploads/artwork/acoustic_breeze.png', uploadedBy: 'seed', mimeType: 'audio/mpeg' },
  { title: 'Techno Pulse', artist: 'Bear Machine', album: 'Beat Machine', genre: 'Techno', duration: 302, audioFile: 'seed_techno.mp3', artwork: '/uploads/artwork/techno_pulse.png', uploadedBy: 'seed', mimeType: 'audio/mpeg' },
  { title: 'Ocean Whispers', artist: 'Calm Tides', album: 'Ocean Whispers', genre: 'Ambient', duration: 250, audioFile: 'seed_ocean.mp3', artwork: '/uploads/artwork/ocean_whispers.png', uploadedBy: 'seed', mimeType: 'audio/mpeg' },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[SEED] Connected to MongoDB');

    // Clear existing data
    await Track.deleteMany({});
    await Playlist.deleteMany({});
    console.log('[SEED] Cleared existing tracks and playlists');

    // Insert tracks
    const tracks = await Track.insertMany(SEEDED_TRACKS);
    console.log(`[SEED] Inserted ${tracks.length} tracks`);

    // Create sample playlists
    const sampleUser = await User.findOne();
    const creatorUid = sampleUser?.uid || 'seed_user';

    await Playlist.create({
      name: 'Chill Vibes',
      description: 'Relax and unwind with smooth vibes.',
      creator: creatorUid,
      artwork: '/uploads/artwork/lofi_sunset.png',
      tracks: [
        { trackId: tracks[0]._id, order: 0 },
        { trackId: tracks[5]._id, order: 1 },
        { trackId: tracks[3]._id, order: 2 },
        { trackId: tracks[2]._id, order: 3 },
        { trackId: tracks[1]._id, order: 4 },
      ],
    });

    await Playlist.create({
      name: 'Workout Mix',
      description: 'High energy beats for hard workouts.',
      creator: creatorUid,
      artwork: '/uploads/artwork/techno_pulse.png',
      tracks: [
        { trackId: tracks[4]._id, order: 0 },
        { trackId: tracks[1]._id, order: 1 },
      ],
    });

    console.log('[SEED] Created sample playlists');
    console.log('[SEED] Done!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[SEED] Error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
