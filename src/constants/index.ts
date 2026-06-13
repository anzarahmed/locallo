export const MAX_SECONDARY_IMAGES = 3;

export const PAGE_LIMIT = 20;

export const COUNTRY_CODES = [
  { code: '+91',  label: '+91'  },
  { code: '+1',   label: '+1'   },
  { code: '+44',  label: '+44'  },
  { code: '+971', label: '+971' },
  { code: '+65',  label: '+65'  },
] as const;

export type FilterTab = 'all' | 'visible' | 'hidden';

export const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: 'all',     label: 'All'     },
  { value: 'visible', label: 'Visible' },
  { value: 'hidden',  label: 'Hidden'  },
];

export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'sort_newest',         label: 'Newest'            },
  { value: 'sort_price_high_low', label: 'Price: High → Low' },
  { value: 'sort_price_low_high', label: 'Price: Low → High' },
  { value: 'sort_stock_high_low', label: 'Stock: High → Low' },
  { value: 'sort_stock_low_high', label: 'Stock: Low → High' },
  { value: 'sort_name_az',        label: 'Name: A–Z'         },
];
