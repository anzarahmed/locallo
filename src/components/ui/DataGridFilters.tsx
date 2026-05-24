import { ChevronDown } from 'lucide-react';
import type { JSX } from 'react';

interface ColumnTextFilterProps {
  value: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}

interface ColumnSelectFilterProps {
  value: string;
  onChange: (value: string | undefined) => void;
  options: Array<{ label: string; value: string }>;
}

const INPUT_CLASS =
  'w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder:text-gray-400 font-normal normal-case tracking-normal text-gray-700 transition-shadow';

export function ColumnTextFilter({ value, onChange, placeholder = 'Filter…' }: ColumnTextFilterProps): JSX.Element {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value || undefined)}
      placeholder={placeholder}
      className={INPUT_CLASS}
    />
  );
}

export function ColumnSelectFilter({ value, onChange, options }: ColumnSelectFilterProps): JSX.Element {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value || undefined)}
        className={`${INPUT_CLASS} appearance-none pr-7`}
      >
        <option value="">All</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
    </div>
  );
}
