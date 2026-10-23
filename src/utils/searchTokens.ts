export function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isNumericToken(token: string): boolean {
  return /^\d+$/.test(token);
}

// Words of 1–2 characters are almost always sizes (S, M, XL, 7, 42); as substrings they
// match inside unrelated words ("l" in "black", "m" in "demo"), so they match whole words only.
export function isShortToken(token: string): boolean {
  return token.length <= 2;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchesToken(haystack: string, token: string): boolean {
  const lowerHaystack = haystack.toLowerCase();

  if (isShortToken(token) || isNumericToken(token)) {
    return new RegExp(`\\b${escapeRegExp(token)}\\b`).test(lowerHaystack);
  }

  if (lowerHaystack.includes(token)) return true;
  return normalizeForMatch(haystack).includes(normalizeForMatch(token));
}
