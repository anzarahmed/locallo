import type { JSX } from 'react';

interface ToggleSwitchProps {
  active: boolean;
  onToggle: () => void;
  title?: string;
}

export default function ToggleSwitch({ active, onToggle, title }: ToggleSwitchProps): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      title={title ?? (active ? 'Deactivate' : 'Activate')}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
        active ? 'bg-emerald-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          active ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
