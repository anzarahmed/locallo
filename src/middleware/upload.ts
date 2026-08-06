import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';

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

const ALLOWED_ICON_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
const ALLOWED_ICON_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.svg'];

function isAllowedIconFile(file: Express.Multer.File): boolean {
  if (file.mimetype !== 'application/octet-stream') {
    return ALLOWED_ICON_MIME_TYPES.includes(file.mimetype);
  }
  const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
  return ALLOWED_ICON_EXTENSIONS.includes(ext);
}

export function uploadArray(field: string, maxCount: number) {
  const middleware = upload.array(field, maxCount);
  return (req: Request, res: Response, next: NextFunction): void => {
    middleware(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        sendError(res, 'Each image must be 5 MB or smaller', 400);
        return;
      }
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_COUNT') {
        sendError(res, `You can upload up to ${maxCount} images at a time`, 400);
        return;
      }
      if (err) {
        sendError(res, err instanceof Error ? err.message : 'Image upload failed', 400);
        return;
      }
      next();
    });
  };
}

export const uploadIcon = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req: Request, file, cb) => {
    if (isAllowedIconFile(file)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and SVG icons are allowed'));
    }
  },
});

export default upload;
