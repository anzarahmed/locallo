import type { JSX } from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: JSX.Element;
}

export default function FormField({ label, required, error, children }: FormFieldProps): JSX.Element {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-rose-500 mt-1.5">{error}</p>}
    </div>
  );
}
