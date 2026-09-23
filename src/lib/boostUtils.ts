import type { BoostAudienceType } from '../types';

export const AUDIENCE_TYPE_CODE: Record<BoostAudienceType, 0 | 1 | 2> = {
  pan_india: 0,
  state: 1,
  city: 2,
};

const IMPRESSIONS_PER_RUPEE = 20;
const RANGE_THRESHOLD_BUDGET = 150;
const RANGE_SPREAD = 100;

export function estimateImpressions(dailyBudget: number): { min: number; max: number } {
  const max = dailyBudget * IMPRESSIONS_PER_RUPEE;
  if (dailyBudget < RANGE_THRESHOLD_BUDGET) {
    return { min: max, max };
  }
  return { min: max - RANGE_SPREAD, max };
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
