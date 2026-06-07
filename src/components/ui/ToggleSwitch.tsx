import type { JSX } from 'react';

interface Props {
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function ToggleSwitch({ active, onToggle, disabled = false }: Props): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
        active ? 'bg-teal-500' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          active ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
