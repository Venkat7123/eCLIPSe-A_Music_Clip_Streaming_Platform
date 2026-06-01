import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOADS_DIR = path.resolve('uploads');

const ALLOWED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/mp4', 'audio/x-m4a'];
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (file.fieldname === 'audio') {
    if (ALLOWED_AUDIO.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid audio type: ${file.mimetype}. Allowed: ${ALLOWED_AUDIO.join(', ')}`), false);
    }
  } else if (file.fieldname === 'artwork') {
    if (ALLOWED_IMAGE.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid image type: ${file.mimetype}. Allowed: ${ALLOWED_IMAGE.join(', ')}`), false);
    }
  } else {
    cb(new Error(`Unexpected field: ${file.fieldname}`), false);
  }
}

export const uploadTrack = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'artwork', maxCount: 1 },
]);

export const uploadArtwork = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}).single('artwork');
