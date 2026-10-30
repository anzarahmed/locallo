import { formatDate } from './dateFormat';

export function formatPrice(val: number | null | undefined): string {
  if (val == null) return '—';
  return `₹${val.toLocaleString('en-IN')}`;
}

// DECIMAL prices reach the client as strings ("1500.00") despite their number types,
// and comparing those directly is alphabetical: "1500.00" < "900.00".
export function discountPct(selling: number, mrp: number | null | undefined): number | null {
  const sellingValue = Number(selling);
  const mrpValue = Number(mrp);
  if (!mrpValue || mrpValue <= sellingValue) return null;
  return Math.round(((mrpValue - sellingValue) / mrpValue) * 100);
}

export function hasDiscount(mrp: number | null | undefined, sellingPrice: number): boolean {
  return mrp != null && Number(mrp) > Number(sellingPrice);
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

  return formatDate(iso);
}
