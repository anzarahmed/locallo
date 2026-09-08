import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from '../constants';

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Only JPEG, PNG, and WebP images are allowed';
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return `Image size should not exceed ${MAX_IMAGE_SIZE_MB} MB`;
  }
  return null;
}

export function resolveImage(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}
