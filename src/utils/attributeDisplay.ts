import type { AttributeField } from '../types';

export function toTitleCase(value: string): string {
  if (!value) return value;
  return value
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// A field is only safe to re-case when nothing constrains its stored value to a fixed
// slug/id — that's any field with no `options` list, regardless of its declared type
// (a 'color' or 'select' field with no options is just as freeform as 'text'; a field
// WITH options must stay byte-identical for lookups/grouping). Textarea is long-form
// prose and is never re-cased. Product-level attributes can hold an array of values
// aggregated across variants (e.g. all colors in use), so array entries are re-cased too.
export function normalizeFreeTextAttributes(
  attributes: Record<string, unknown>,
  schema: AttributeField[],
): Record<string, unknown> {
  if (!attributes) return attributes;

  const freeTextKeys = new Set(
    schema.filter(f => f.type !== 'textarea' && (!f.options || f.options.length === 0)).map(f => f.key),
  );
  if (freeTextKeys.size === 0) return attributes;

  const result: Record<string, unknown> = { ...attributes };
  for (const key of Object.keys(result)) {
    if (!freeTextKeys.has(key)) continue;
    const value = result[key];
    if (typeof value === 'string') {
      result[key] = toTitleCase(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(v => (typeof v === 'string' ? toTitleCase(v) : v));
    }
  }
  return result;
}
