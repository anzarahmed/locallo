import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOADS_ROOT = path.join(__dirname, '../../uploads/products');

export function saveImage(file: Express.Multer.File, sellerId: string): string {
  const sellerDir = path.join(UPLOADS_ROOT, sellerId);
  if (!fs.existsSync(sellerDir)) {
    fs.mkdirSync(sellerDir, { recursive: true });
  }

  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const filename = `${randomUUID()}${ext}`;
  const dest = path.join(sellerDir, filename);

  fs.writeFileSync(dest, file.buffer);

  return `/uploads/products/${sellerId}/${filename}`;
}

export function deleteImage(url: string): void {
  const rel = url.replace(/^\/uploads\//, '');
  const abs = path.join(path.join(__dirname, '../../uploads'), rel);
  if (fs.existsSync(abs)) {
    fs.unlinkSync(abs);
  }
}
