import type { JSX } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { inputCls } from '../../lib/classUtils';
import type { AttributeField } from '../../types';

export type AttrValue = string | number | string[];

interface AttrInputProps {
  field: AttributeField;
  value: AttrValue;
  onChange: (v: AttrValue) => void;
}

export default function AttrInput({ field, value, onChange }: AttrInputProps): JSX.Element {
  const str = Array.isArray(value) ? '' : String(value as string | number);
  const arr = Array.isArray(value) ? (value as string[]) : [];

  function toggleChip(v: string): void {
    onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  }

  const labelEl = (
    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
      {field.label}
      {field.required && <span className="text-rose-400 ml-0.5">*</span>}
      {field.unit && <span className="text-gray-400 font-normal ml-1">({field.unit})</span>}
    </label>
  );

  if (field.type === 'multiselect') {
    return (
      <div>
        {labelEl}
        <div className="flex flex-wrap gap-2">
          {field.options?.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleChip(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                arr.includes(opt.value)
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-teal-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'color') {
    const selected = typeof value === 'string' ? value : '';
    return (
      <div>
        {labelEl}
        <div className="flex flex-wrap gap-2">
          {field.options?.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(selected === opt.value ? '' : opt.value)}
              title={opt.label}
              className={`w-9 h-9 rounded-full border-2 transition-all relative flex items-center justify-center ${
                selected === opt.value
                  ? 'border-teal-500 scale-110 shadow-md ring-2 ring-teal-200'
                  : 'border-gray-200 hover:scale-105'
              }`}
              style={{ backgroundColor: opt.hex ?? opt.value }}
            >
              {selected === opt.value && (
                <span className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                  <Check size={11} className="text-teal-600" strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
        {selected && (
          <p className="text-xs text-gray-400 mt-1.5">
            Selected: {field.options?.find(o => o.value === selected)?.label ?? selected}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {labelEl}
      {field.type === 'textarea' ? (
        <textarea
          value={str}
          onChange={e => onChange(e.target.value)}
          rows={3}
          placeholder={field.unit ?? ''}
          className={`${inputCls(false)} resize-none`}
        />
      ) : field.type === 'select' ? (
        <div className="relative">
          <select
            value={str}
            onChange={e => onChange(e.target.value)}
            className={`w-full appearance-none ${inputCls(false)} pr-8`}
          >
            <option value="">Select…</option>
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      ) : (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={str}
          onChange={e => onChange(
            field.type === 'number'
              ? (e.target.value === '' ? '' : Number(e.target.value))
              : e.target.value
          )}
          placeholder={field.unit ?? ''}
          className={inputCls(false)}
        />
      )}
    </div>
  );
}
