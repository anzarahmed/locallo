import { apiGet } from '../lib/axios';
import { PATHS } from '../api/paths';

export type ActivityType = 'seller_added' | 'seller_verified' | 'product_added' | 'category_added' | 'subadmin_added';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: string;
}

export function getRecentActivity(limit = 5): Promise<{ activities: ActivityItem[] }> {
  return apiGet<{ activities: ActivityItem[] }>(`${PATHS.DASHBOARD.RECENT_ACTIVITY}?limit=${limit}`);
}
