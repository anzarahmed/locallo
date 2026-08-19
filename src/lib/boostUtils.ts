import type { BoostAudienceType } from '../types';

export const AUDIENCE_TYPE_CODE: Record<BoostAudienceType, 0 | 1 | 2> = {
  pan_india: 0,
  state: 1,
  city: 2,
};

const IMPRESSIONS_PER_RUPEE = 20;

export function estimateImpressions(dailyBudget: number): { min: number; max: number } {
  const max = dailyBudget * IMPRESSIONS_PER_RUPEE;
  const min = max - Math.round(max * 0.005);
  return { min, max };
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
