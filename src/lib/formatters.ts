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

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.max(0, Math.round(diffMs / 1000));

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
