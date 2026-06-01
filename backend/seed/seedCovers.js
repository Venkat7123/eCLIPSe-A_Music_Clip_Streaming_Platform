/**
 * Seed script: insert preset playlist cover images into MongoDB.
 * Run: node seed/seedCovers.js
 *
 * Replace the `url` values below with your actual Cloudinary URLs.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import PlaylistCover from '../models/PlaylistCover.js';

const COVERS = [
  // ── Paste your 9 Cloudinary URLs below ──
  {
    name: 'Tamil Mass',
    url: 'https://res.cloudinary.com/dcprcbori/image/upload/v1780217820/eclipse/playlists/kolly_mass.jpg',
    tags: ['tamil', 'mass', 'beats'],
    order: 1,
  },
  {
    name: 'Fun & Gaming',
    url: 'https://res.cloudinary.com/dcprcbori/image/upload/v1780217819/eclipse/playlists/gaming_mass.jpg',
    tags: ['fun', 'gaming', 'meme'],
    order: 2,
  },
  {
    name: 'Pop Culture',
    url: 'https://res.cloudinary.com/dcprcbori/image/upload/v1780217816/eclipse/playlists/dance_cover.jpg',
    tags: ['pop', 'culture'],
    order: 3,
  },
  {
    name: 'Tamil Melody',
    url: 'https://res.cloudinary.com/dcprcbori/image/upload/v1780217823/eclipse/playlists/tamil_melody.jpg',
    tags: ['tamil', 'melody', 'soft'],
    order: 4,
  },
  {
    name: 'Synthwave Cover',
    url: 'https://res.cloudinary.com/dcprcbori/image/upload/v1780217822/eclipse/playlists/synthwave_cover.jpg',
    tags: ['synthwave', 'theme', 'action'],
    order: 5,
  },
  {
    name: 'Lofi',
    url: 'https://res.cloudinary.com/dcprcbori/image/upload/v1780217821/eclipse/playlists/lofi_cover.jpg',
    tags: ['lofi', 'theme', 'action'],
    order: 6,
  },
  {
    name: 'Focus Theme',
    url: 'https://res.cloudinary.com/dcprcbori/image/upload/v1780217817/eclipse/playlists/focus_cover.jpg',
    tags: ['focus', 'theme'],
    order: 7,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[SEED] Connected to MongoDB');

  // Clear existing covers
  await PlaylistCover.deleteMany({});
  console.log('[SEED] Cleared existing covers');

  // Insert new covers
  const inserted = await PlaylistCover.insertMany(COVERS);
  console.log(`[SEED] Inserted ${inserted.length} covers`);

  await mongoose.disconnect();
  console.log('[SEED] Done ✓');
}

seed().catch((err) => {
  console.error('[SEED] Error:', err);
  process.exit(1);
});
