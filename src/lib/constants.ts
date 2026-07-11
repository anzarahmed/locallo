export const DEFAULT_PAGE_SIZE = 5;
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100] as const;

export const STATUS_FILTER_OPTIONS = [
  { label: 'Active',   value: 'true'  },
  { label: 'Inactive', value: 'false' },
] as const;

export const VERIFIED_FILTER_OPTIONS = [
  { label: 'Verified',   value: 'true'  },
  { label: 'Unverified', value: 'false' },
] as const;

export const SUB_ADMIN_ROLE_OPTIONS: Array<{ value: 'manager' | 'operator'; label: string }> = [
  { value: 'manager',  label: 'Manager'  },
  { value: 'operator', label: 'Operator' },
];

export const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
] as const;

export const ROLE_BADGE_CLASSES: Record<string, string> = {
  manager:  'bg-indigo-100 text-indigo-700',
  operator: 'bg-violet-100 text-violet-700',
};
