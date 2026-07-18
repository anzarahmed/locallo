import type { AttributeField } from '../types';

export type AttrValue = string | number | string[];

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
