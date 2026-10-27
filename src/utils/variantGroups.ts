import type { AttributeField } from '../types';

function normalizeAttrValue(v: unknown): string {
  return String(v ?? '').trim().toLowerCase();
}

export function getComboKey(attrs: Record<string, unknown>, keys: string[]): string {
  return keys
    .map(key => `${key}:${normalizeAttrValue(attrs[key])}`)
    .sort()
    .join('|');
}

export function getStockDependentField(schema: AttributeField[]): AttributeField | undefined {
  return schema.find(f => f.isVariant && f.isStockDependent);
}

// A variant "group" is every option sharing the non-stock-dependent variant attributes
// (e.g. all sizes of one colour). Without a stock-dependent field each combination is
// its own group.
export function getGroupAttributeKeys(schema: AttributeField[]): string[] {
  const sdKey = getStockDependentField(schema)?.key;
  return schema.filter(f => f.isVariant && f.key !== sdKey).map(f => f.key);
}

export function getGroupKey(schema: AttributeField[], attrs: Record<string, unknown>): string {
  return getComboKey(attrs, getGroupAttributeKeys(schema));
}

export function getGroupLabel(schema: AttributeField[], attrs: Record<string, unknown>): string | null {
  const parts = schema
    .filter(f => getGroupAttributeKeys(schema).includes(f.key))
    .map(field => {
      const raw = attrs[field.key];
      if (raw === undefined || raw === null || raw === '') return null;
      const value = String(Array.isArray(raw) ? raw.join(', ') : raw);
      const option = field.options?.find(o => o.value === value);
      return `${field.label}: ${option?.label ?? value}`;
    })
    .filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' · ') : null;
}

// One label per group the new options open that none of the existing options already
// belongs to — each of those uses one listing unit.
export function newGroupLabels(
  schema: AttributeField[],
  newAttrs: Record<string, unknown>[],
  existingAttrs: Record<string, unknown>[],
): (string | null)[] {
  const seen = new Set(existingAttrs.map(attrs => getGroupKey(schema, attrs)));
  const labels: (string | null)[] = [];
  for (const attrs of newAttrs) {
    const key = getGroupKey(schema, attrs);
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(getGroupLabel(schema, attrs));
  }
  return labels;
}
