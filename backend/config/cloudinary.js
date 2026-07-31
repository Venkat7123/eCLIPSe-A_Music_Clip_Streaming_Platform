import { v2 as cloudinary } from 'cloudinary';

const isConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('[CLOUDINARY] Configured:', process.env.CLOUDINARY_CLOUD_NAME);
} else {
  console.warn('[CLOUDINARY] Not configured — file uploads will use local storage');
}

export { cloudinary };
export const isCloudinaryConfigured = Boolean(isConfigured);
