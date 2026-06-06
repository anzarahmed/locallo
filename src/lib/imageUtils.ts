export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function resolveImage(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}
