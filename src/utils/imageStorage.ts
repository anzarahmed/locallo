import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import path from 'path';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  // credentials: {
  //   accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  // },
});

const BUCKET = process.env.AWS_S3_BUCKET!;
const SIGNED_URL_TTL = 60 * 60; // 1 hour

export function resolveMimeType(buffer: Buffer, originalname: string, declaredMime: string): string {
  if (declaredMime !== 'application/octet-stream') return declaredMime;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer.length > 11 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp';
  const ext = originalname.toLowerCase().slice(originalname.lastIndexOf('.'));
  const extMap: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
  return extMap[ext] ?? 'image/jpeg';
}

// Extracts the S3 key from a canonical URL, presigned URL, or plain key
function toKey(urlOrKey: string): string {
  if (!urlOrKey.startsWith('http')) return urlOrKey.replace(/^\//, '');
  return new URL(urlOrKey).pathname.slice(1);
}

export async function saveImage(file: Express.Multer.File, sellerId: string): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const key = `uploads/temp/${sellerId}/${randomUUID()}${ext}`;
  const contentType = resolveMimeType(file.buffer, file.originalname, file.mimetype);

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: contentType,
  }));

  return key;
}

export async function saveKycDocument(file: Express.Multer.File, sellerId: string, documentType: string): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const key = `uploads/kyc/${sellerId}/${documentType}-${randomUUID()}${ext}`;
  const contentType = resolveMimeType(file.buffer, file.originalname, file.mimetype);

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: contentType,
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

export async function getPresignedUrlOrNull(keyOrUrl: string | null | undefined, expiresIn = SIGNED_URL_TTL): Promise<string | null> {
  if (!keyOrUrl) return null;
  return getPresignedUrl(keyOrUrl, expiresIn);
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

export async function signModelRows(
  rows: Array<{ toJSON(): unknown }>,
): Promise<Record<string, unknown>[]> {
  return Promise.all(rows.map(r => withSignedImages(r.toJSON() as Record<string, unknown>)));
}

export async function deleteImage(urlOrKey: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: toKey(urlOrKey),
  }));
}

export async function commitImage(tempKey: string): Promise<string> {
  const permanentKey = tempKey.replace('uploads/temp/', 'uploads/products/');
  try {
    await s3.send(new CopyObjectCommand({
      Bucket: BUCKET,
      CopySource: `${BUCKET}/${tempKey}`,
      Key: permanentKey,
    }));
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: tempKey }));
  } catch (err: unknown) {
    // Group variant edits fire one update per variant in parallel with the same
    // temp image key — the first request's commit races the rest, which find the
    // temp object already moved. Treat that as success if the destination exists.
    if (err instanceof Error && err.name === 'NoSuchKey') {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: permanentKey }));
      return permanentKey;
    }
    throw err;
  }
  return permanentKey;
}

export async function commitImages(keys: string[]): Promise<string[]> {
  if (!keys.length) return [];
  return Promise.all(
    keys.map(key => key.startsWith('uploads/temp/') ? commitImage(key) : key),
  );
}

export async function commitCategoryIcon(tempKeyOrKey: string): Promise<string> {
  const TEMP_PREFIX = 'uploads/temp/categories/';
  if (!tempKeyOrKey.startsWith(TEMP_PREFIX)) return tempKeyOrKey;
  const permanentKey = tempKeyOrKey.replace(TEMP_PREFIX, 'uploads/categories/');
  await s3.send(new CopyObjectCommand({
    Bucket: BUCKET,
    CopySource: `${BUCKET}/${tempKeyOrKey}`,
    Key: permanentKey,
  }));
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: tempKeyOrKey }));
  return permanentKey;
}
