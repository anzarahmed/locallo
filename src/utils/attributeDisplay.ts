import type { AttributeField } from '../types';

export function toTitleCase(value: string): string {
  if (!value) return value;
  return value
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Select/multiselect/color fields store a fixed option value (often a slug) that must
// stay byte-identical for lookups/grouping — only plain free-text fields (no options)
// are safe to re-case, since sellers (and the native apps) type those by hand with no
// constraint, which is how a value like "Multi Color" drifts into odd casing.
export function normalizeFreeTextAttributes(
  attributes: Record<string, unknown>,
  schema: AttributeField[],
): Record<string, unknown> {
  if (!attributes) return attributes;

  const freeTextKeys = new Set(
    schema.filter(f => f.type === 'text' && (!f.options || f.options.length === 0)).map(f => f.key),
  );
  if (freeTextKeys.size === 0) return attributes;

  const result: Record<string, unknown> = { ...attributes };
  for (const key of Object.keys(result)) {
    if (freeTextKeys.has(key) && typeof result[key] === 'string') {
      result[key] = toTitleCase(result[key] as string);
    }
  }
  return result;
}
