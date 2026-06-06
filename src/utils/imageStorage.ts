import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;
const SIGNED_URL_TTL = 60 * 60; // 1 hour

// Extracts the S3 key from a canonical URL, presigned URL, or plain key
function toKey(urlOrKey: string): string {
  if (!urlOrKey.startsWith('http')) return urlOrKey.replace(/^\//, '');
  return new URL(urlOrKey).pathname.slice(1);
}

export async function saveImage(file: Express.Multer.File, sellerId: string): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const key = `uploads/products/${sellerId}/${randomUUID()}${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  return key;
}

export async function getPresignedUrl(keyOrUrl: string, expiresIn = SIGNED_URL_TTL): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: toKey(keyOrUrl) }),
    { expiresIn },
  );
}

export async function signImages(images: string[]): Promise<string[]> {
  if (!images.length) return [];
  return Promise.all(images.map(img => getPresignedUrl(img)));
}

// Normalise any URL/presigned-URL/key to a plain S3 key for DB storage
export function normalizeImageKey(urlOrKey: string): string {
  return toKey(urlOrKey);
}

export async function withSignedImages<T extends Record<string, unknown>>(obj: T): Promise<T> {
  const images = Array.isArray(obj.images) ? (obj.images as string[]) : [];
  return { ...obj, images: await signImages(images) };
}

export async function deleteImage(urlOrKey: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: toKey(urlOrKey),
  }));
}
