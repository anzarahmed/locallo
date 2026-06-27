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

export function buildProductVariantAttrs(
  variantFields: AttributeField[],
  selections: VariantSelections,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of variantFields) {
    const sel = selections[field.key];
    if (!sel || sel === '' || (Array.isArray(sel) && sel.length === 0)) continue;
    if (field.type === 'color' || field.type === 'select') {
      result[field.key] = [sel as string];
    } else if (field.type === 'multiselect') {
      result[field.key] = sel as string[];
    } else {
      result[field.key] = sel as string;
    }
  }
  return result;
}
