import { AVATAR_COLORS } from './constants';

export function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export function getAvatarColor(name: string | null): string {
  if (!name) return AVATAR_COLORS[0];
  const sum = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}
