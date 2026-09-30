export function toTitleCase(value: string): string {
  if (!value) return value;
  return value
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
