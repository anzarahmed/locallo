import multer from 'multer';
import type { Request } from 'express';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function isAllowedFile(file: Express.Multer.File): boolean {
  if (file.mimetype !== 'application/octet-stream') {
    return ALLOWED_MIME_TYPES.includes(file.mimetype);
  }
  const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
  return ALLOWED_EXTENSIONS.includes(ext);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req: Request, file, cb) => {
    if (isAllowedFile(file)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  },
});

export default upload;
