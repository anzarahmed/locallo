import { useState, type InputHTMLAttributes, type JSX } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  label: string;
  name: string;
  touched?: boolean;
  error?: string;
}

export default function AuthField({
  label,
  name,
  type = 'text',
  touched,
  error,
  required,
  ...rest
}: AuthFieldProps): JSX.Element {
  const [show, setShow] = useState<boolean>(false);
  const isPassword = type === 'password';
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
          type={isPassword ? (show ? 'text' : 'password') : type}
          required={required}
          {...rest}
          className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${
            isPassword ? 'pr-10' : ''
          } ${
            invalid
              ? 'border-red-400 focus:ring-red-400 bg-red-50'
              : 'border-gray-300 focus:ring-indigo-500'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={(): void => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {invalid && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
