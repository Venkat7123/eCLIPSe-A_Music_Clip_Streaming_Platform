import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const images = [
  'acoustic_cover.png',
  'dance_cover.png',
  'focus_cover.png',
  'gaming_mass.png',
  'kolly_mass.png',
  'lofi_cover.png',
  'synthwave_cover.png',
  'tamil_melody.png',
];

const assetsDir = path.resolve(__dirname, '../../frontend/src/assets');

async function uploadAll() {
  const results = [];
  for (const img of images) {
    const filePath = path.join(assetsDir, img);
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: 'image',
        folder: 'eclipse/playlists',
        public_id: img.replace('.png', ''),
        transformation: [{ width: 500, height: 500, crop: 'limit', quality: 'auto' }],
      });
      console.log(`✓ ${img} → ${result.secure_url}`);
      results.push({ name: img, url: result.secure_url });
    } catch (err) {
      console.error(`✗ ${img}: ${err.message}`);
    }
  }

  console.log('\n--- Playlist Art URLs (paste into frontend/src/config/playlistArt.js) ---');
  console.log('export const PLAYLIST_ART = [');
  for (const r of results) {
    console.log(`  { name: '${r.name.replace('.png', '')}', url: '${r.url}' },`);
  }
  console.log('];');
}

uploadAll();
