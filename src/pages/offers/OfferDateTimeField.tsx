import type { ChangeEvent, FocusEvent, JSX } from 'react';
import { formatDateTime } from '../../lib/dateFormat';

interface OfferDateTimeFieldProps {
  label: string;
  name: string;
  /** YYYY-MM-DDTHH:mm (datetime-local format), or '' when empty */
  value: string;
  min?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: FocusEvent<HTMLInputElement>) => void;
  touched?: boolean;
  error?: string;
  required?: boolean;
}

// The native datetime-local input renders in the browser's locale format, which can't be
// configured — its own text is hidden and a DD/MM/YYYY overlay is drawn in its place,
// while the native picker popup is kept.
export default function OfferDateTimeField({
  label, name, value, min, onChange, onBlur, touched, error, required,
}: OfferDateTimeFieldProps): JSX.Element {
  const invalid = touched === true && Boolean(error);

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type="datetime-local"
          required={required}
          min={min}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onClick={e => e.currentTarget.showPicker?.()}
          className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-transparent cursor-pointer
            [&::-webkit-datetime-edit]:opacity-0 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${
            invalid
              ? 'border-red-400 focus:ring-red-400 bg-red-50'
              : 'border-gray-300 focus:ring-indigo-500'
          }`}
        />
        <span
          className={`pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm ${
            value ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          {value ? formatDateTime(value) : 'DD/MM/YYYY, hh:mm AM'}
        </span>
      </div>
      {invalid && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
