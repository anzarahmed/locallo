import { type JSX, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  label: string;
  name: string;
  touched?: boolean;
  error?: string;
  children: React.ReactNode;
}

export default function SelectField({
  label,
  name,
  touched,
  error,
  children,
  required,
  ...rest
}: SelectFieldProps): JSX.Element {
  const invalid = touched === true && Boolean(error);

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          id={name}
          name={name}
          {...rest}
          className={`w-full appearance-none px-3.5 py-2.5 pr-9 border rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-shadow cursor-pointer ${
            invalid
              ? 'border-red-400 focus:ring-red-400 bg-red-50'
              : 'border-gray-300 focus:ring-indigo-500'
          }`}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>
      {invalid && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
