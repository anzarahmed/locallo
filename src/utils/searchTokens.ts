export function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isNumericToken(token: string): boolean {
  return /^\d+$/.test(token);
}

export function matchesToken(haystack: string, token: string): boolean {
  const lowerHaystack = haystack.toLowerCase();

  if (isNumericToken(token)) {
    return new RegExp(`\\b${token}\\b`).test(lowerHaystack);
  }

  if (lowerHaystack.includes(token)) return true;
  return normalizeForMatch(haystack).includes(normalizeForMatch(token));
}
