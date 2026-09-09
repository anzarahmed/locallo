import type { AttributeField } from '../types';

export type AttrValue = string | number | string[];

function isBlankAttr(v: unknown): boolean {
  return v === undefined || v === null || v === '' ||
    (Array.isArray(v) && v.length === 0);
}

/**
 * Returns the required fields whose value is missing. `values` must already merge
 * non-variant attributes with the current variant selections. Pass skipVariant
 * when variant options are managed elsewhere (a product that already has variants).
 */
export function findMissingRequiredAttrs(
  schema: AttributeField[],
  values: Record<string, unknown>,
  skipVariant = false,
): AttributeField[] {
  return schema.filter(f => {
    if (!f.required) return false;
    if (f.isVariant && skipVariant) return false;
    return isBlankAttr(values[f.key]);
  });
}

/**
 * Maps each missing required field to an inline error message keyed by field key.
 * Same argument contract as findMissingRequiredAttrs; wording matches the backend.
 */
export function buildRequiredAttrErrors(
  schema: AttributeField[],
  values: Record<string, unknown>,
  skipVariant = false,
): Record<string, string> {
  return Object.fromEntries(
    findMissingRequiredAttrs(schema, values, skipVariant)
      .map(f => [f.key, `${f.label} is required`]),
  );
}

export function normalizeAttrValues(
  rawAttrs: Record<string, unknown>,
  schema: AttributeField[],
): Record<string, AttrValue> {
  const out: Record<string, AttrValue> = {};
  for (const field of schema) {
    const val = rawAttrs[field.key];
    if (val === undefined || val === null) continue;
    if (field.type === 'multiselect') {
      out[field.key] = Array.isArray(val) ? (val as string[]) : [String(val)];
    } else if (field.type === 'number') {
      out[field.key] = val === '' ? '' : Number(val);
    } else {
      out[field.key] = String(val);
    }
  }
  return out;
}
