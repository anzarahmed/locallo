import type { AttributeField, ProductVariant } from '../types';

export type VariantSelections = Record<string, string | string[]>;

export interface VariantGroup {
  key: string;
  nonSdAttrs: Record<string, string>;
  variants: ProductVariant[];
}

export function groupVariants(variants: ProductVariant[], sdKey: string): VariantGroup[] {
  const map = new Map<string, VariantGroup>();
  for (const v of variants) {
    const entries = Object.entries(v.attributes as Record<string, string>)
      .filter(([k]) => k !== sdKey)
      .sort(([a], [b]) => a.localeCompare(b));
    const key = entries.map(([k, val]) => `${k}:${val}`).join('|') || '__all__';
    if (!map.has(key)) {
      map.set(key, { key, nonSdAttrs: Object.fromEntries(entries), variants: [] });
    }
    map.get(key)!.variants.push(v);
  }
  return Array.from(map.values());
}

export function groupLabel(nonSdAttrs: Record<string, string>, schema: AttributeField[]): string {
  const entries = Object.entries(nonSdAttrs);
  if (entries.length === 0) return 'All variants';
  return entries
    .map(([key, val]) => {
      const field = schema.find(f => f.key === key);
      return field?.options?.find(o => o.value === val)?.label ?? val;
    })
    .join(' · ');
}

export function pickBoostVariant(variants: ProductVariant[]): ProductVariant {
  const maxStock = Math.max(...variants.map(v => v.stock));
  if (maxStock <= 0) return variants[0];
  return variants.find(v => v.stock === maxStock) ?? variants[0];
}

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

// Stock rows are labelled by stock-dependent values only (e.g. "Stock – S"), so when
// another variant axis like Color changes, a row keeps its stock if its SD values match.
export function carryOverComboStocks(
  prevStocks: Record<string, string>,
  prevCombinations: Record<string, string>[],
  nextCombinations: Record<string, string>[],
  sdFields: AttributeField[],
): Record<string, string> {
  const sdKeyOf = (combo: Record<string, string>): string =>
    sdFields.map(f => `${f.key}:${combo[f.key] ?? ''}`).join('|');

  const bySdKey = new Map<string, string>();
  for (const combo of prevCombinations) {
    const stock = prevStocks[getCombinationKey(combo)];
    const sdKey = sdKeyOf(combo);
    if (stock !== undefined && stock !== '' && !bySdKey.has(sdKey)) bySdKey.set(sdKey, stock);
  }

  const next: Record<string, string> = {};
  for (const combo of nextCombinations) {
    const key = getCombinationKey(combo);
    const stock = prevStocks[key] ?? bySdKey.get(sdKeyOf(combo));
    if (stock !== undefined) next[key] = stock;
  }
  return next;
}

export function hasStockDependentAttr(variantFields: AttributeField[]): boolean {
  return variantFields.some(f => f.isStockDependent === true);
}

export function validateStockValue(raw: string | undefined): string | null {
  if (raw === undefined || raw === '') return 'Stock is required';
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return 'Enter a whole number';
  if (n <= 0) return 'Stock must be greater than 0';
  return null;
}

export function validateComboStocks(
  combinations: Record<string, string>[],
  comboStocks: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const combo of combinations) {
    const key = getCombinationKey(combo);
    const error = validateStockValue(comboStocks[key]);
    if (error) errors[key] = error;
  }
  return errors;
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
