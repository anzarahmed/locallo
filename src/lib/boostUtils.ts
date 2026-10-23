import type { BoostAudienceType } from '../types';

// The server cancels an unpaid boost when the action leaves it nothing visible to promote
// (product hidden/deleted, or its last visible option hidden/deleted).
export function cancelledBoostMessage(cancelledBoosts: number | undefined): string | null {
  if (!cancelledBoosts) return null;
  return cancelledBoosts === 1
    ? 'Your unpaid boost for this product was cancelled because nothing visible is left to promote.'
    : `${cancelledBoosts} unpaid boosts for this product were cancelled because nothing visible is left to promote.`;
}

export const AUDIENCE_TYPE_CODE: Record<BoostAudienceType, 0 | 1 | 2> = {
  pan_india: 0,
  state: 1,
  city: 2,
};

const IMPRESSIONS_PER_RUPEE = 20;
const RANGE_SPREAD = 100;

export function estimateImpressions(dailyBudget: number): { min: number; max: number } {
  const max = dailyBudget * IMPRESSIONS_PER_RUPEE;
  return { min: Math.max(max - RANGE_SPREAD, 0), max };
}

export function formatImpressionRange(min: number, max: number): string {
  if (min === max) return max.toLocaleString('en-IN');
  return `${min.toLocaleString('en-IN')} – ${max.toLocaleString('en-IN')}`;
}

export function formatAudienceLabel(
  audienceType: BoostAudienceType | '',
  state?: string | null,
  city?: string | null,
): string {
  if (audienceType === 'city') return city && state ? `${city}, ${state}` : city ?? '—';
  if (audienceType === 'state') return state ?? '—';
  if (audienceType === 'pan_india') return 'Pan India';
  return '—';
}
