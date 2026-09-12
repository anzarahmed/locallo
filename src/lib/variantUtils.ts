import type { AttributeField } from '../types';

export type VariantSelections = Record<string, string | string[]>;

export function generateCombinations(
  variantFields: AttributeField[],
  selections: VariantSelections,
): Record<string, string>[] {
  const axes: Array<{ key: string; values: string[] }> = [];

  for (const field of variantFields) {
    const sel = selections[field.key];
    if (!sel || sel === '' || (Array.isArray(sel) && sel.length === 0)) continue;
    const values = Array.isArray(sel) ? sel : [sel];
    axes.push({ key: field.key, values });
  }

  if (axes.length === 0) return [];

  return axes.reduce<Record<string, string>[]>(
    (acc, axis) => acc.flatMap(prev => axis.values.map(val => ({ ...prev, [axis.key]: val }))),
    [{}],
  );
}

export function getCombinationKey(combo: Record<string, string>): string {
  return Object.keys(combo).sort().map(k => `${k}:${combo[k]}`).join('|');
}

export function hasStockDependentAttr(variantFields: AttributeField[]): boolean {
  return variantFields.some(f => f.isStockDependent === true);
}

export function categorySupportsVariants(schema: AttributeField[] | undefined): boolean {
  return (schema ?? []).some(f => f.isVariant === true);
}

export function variantLabel(
  attributes: Record<string, unknown>,
  schema: AttributeField[],
): string {
  const fields = schema.filter(f => f.isVariant);
  const source = fields.length > 0 ? fields : schema;
  const parts = source
    .map(f => {
      const v = attributes[f.key];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return null;
      if ((f.type === 'select' || f.type === 'multiselect') && f.options) {
        const vals = Array.isArray(v) ? (v as string[]) : [v as string];
        return vals.map(val => f.options?.find(o => o.value === val)?.label ?? val).join(', ');
      }
      return String(v);
    })
    .filter(Boolean);
  if (parts.length > 0) return parts.join(' · ');
  return Object.values(attributes).filter(Boolean).join(' · ') || 'Variant';
}

export function buildProductVariantAttrs(
  variantFields: AttributeField[],
  selections: VariantSelections,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of variantFields) {
    const sel = selections[field.key];
    if (!sel || sel === '' || (Array.isArray(sel) && sel.length === 0)) continue;
    if (field.type === 'select') {
      result[field.key] = Array.isArray(sel) ? sel : [sel];
    } else if (field.type === 'multiselect') {
      result[field.key] = sel as string[];
    } else {
      result[field.key] = sel as string;
    }
  }
  return result;
}
