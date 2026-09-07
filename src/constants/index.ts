export const MAX_SECONDARY_IMAGES = 3;

export const PAGE_LIMIT = 20;

// India-only until multi-country support is introduced. Matches the fixed +91
// used by the Customer and Seller mobile apps.
export const COUNTRY_CODE = '+91';

export type FilterTab = 'all' | 'visible' | 'hidden';

export const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all',     label: 'All'     },
  { value: 'visible', label: 'Visible' },
  { value: 'hidden',  label: 'Hidden'  },
];

export const MIN_DAILY_BUDGET = 100;
export const MAX_DAILY_BUDGET = 5000;
export const DEFAULT_DAILY_BUDGET = 500;
export const DAILY_BUDGET_STEP = 50;

export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'sort_newest',         label: 'Newest'            },
  { value: 'sort_price_high_low', label: 'Price: High → Low' },
  { value: 'sort_price_low_high', label: 'Price: Low → High' },
  { value: 'sort_stock_high_low', label: 'Stock: High → Low' },
  { value: 'sort_stock_low_high', label: 'Stock: Low → High' },
  { value: 'sort_name_az',        label: 'Name: A–Z'         },
];
