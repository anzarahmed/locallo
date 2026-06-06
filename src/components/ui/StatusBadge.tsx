import type { JSX } from 'react';

interface StatusBadgeProps {
  active: boolean;
  dot?: boolean;
}

export default function StatusBadge({ active, dot = false }: StatusBadgeProps): JSX.Element {
  const colors = active
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-gray-100 text-gray-600 border-gray-200';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
      )}
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
