export function formatPrice(val: number | null | undefined): string {
  if (val == null) return '—';
  return `₹${val.toLocaleString('en-IN')}`;
}

export function discountPct(selling: number, mrp: number | null | undefined): number | null {
  if (!mrp || mrp <= selling) return null;
  return Math.round(((mrp - selling) / mrp) * 100);
}

export function hasDiscount(mrp: number | null | undefined, sellingPrice: number): boolean {
  return mrp != null && mrp > sellingPrice;
}
