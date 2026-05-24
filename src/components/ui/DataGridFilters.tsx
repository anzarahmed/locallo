import {
  useState, useRef, useEffect, useLayoutEffect, useCallback, type JSX,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X } from 'lucide-react';

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

interface ColumnComboboxFilterProps {
  value: string;
  onChange: (value: string | undefined) => void;
  options: Array<{ label: string; value: string }>;
  placeholder?: string;
}

interface DropdownStyle {
  position: 'fixed';
  left: number;
  width: number;
  minWidth: number;
  zIndex: number;
  top?: number;
  bottom?: number;
}

const INPUT_CLASS =
  'w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white shadow-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent ' +
  'placeholder:text-gray-400 font-normal normal-case tracking-normal text-gray-700 transition-shadow';

export function ColumnTextFilter({
  value, onChange, placeholder = 'Filter…',
}: ColumnTextFilterProps): JSX.Element {
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

export function ColumnSelectFilter({
  value, onChange, options,
}: ColumnSelectFilterProps): JSX.Element {
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

export function ColumnComboboxFilter({
  value, onChange, options, placeholder = 'Filter…',
}: ColumnComboboxFilterProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery]   = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<DropdownStyle | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(o => o.value === value);
  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const calcPosition = useCallback((): DropdownStyle | null => {
    if (!inputRef.current) return null;
    const rect            = inputRef.current.getBoundingClientRect();
    const viewportHeight  = window.innerHeight;
    const DROPDOWN_HEIGHT = 192;
    const GAP             = 2;
    const showAbove       = (viewportHeight - rect.bottom) < DROPDOWN_HEIGHT && rect.top > DROPDOWN_HEIGHT;

    return {
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      minWidth: 180,
      zIndex: 9999,
      ...(showAbove
        ? { bottom: viewportHeight - rect.top + GAP }
        : { top: rect.bottom + GAP }),
    };
  }, []);

  useLayoutEffect(() => {
    if (isOpen) setDropdownStyle(calcPosition());
  }, [isOpen, calcPosition]);

  useEffect(() => {
    if (!isOpen) return;
    const update = (): void => setDropdownStyle(calcPosition());
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, calcPosition]);

  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e: MouseEvent): void {
      const inWrapper = wrapperRef.current?.contains(e.target as Node) ?? false;
      const inList    = listRef.current?.contains(e.target as Node) ?? false;
      if (!inWrapper && !inList) {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  function open(): void { setIsOpen(true); setQuery(''); }
  function close(): void { setIsOpen(false); setQuery(''); }

  const dropdown = isOpen && dropdownStyle
    ? createPortal(
        <ul
          ref={listRef}
          style={dropdownStyle}
          className="bg-white border border-gray-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto py-1 outline-none"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-gray-400 italic text-center">No results</li>
          ) : (
            filtered.map(opt => (
              <li
                key={opt.value}
                onMouseDown={e => {
                  e.preventDefault();
                  onChange(opt.value);
                  close();
                }}
                className={`mx-1 px-2.5 py-2 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                  opt.value === value
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>,
        document.body,
      )
    : null;

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          placeholder={selectedOption ? selectedOption.label : placeholder}
          value={isOpen ? query : (selectedOption?.label ?? '')}
          onFocus={() => { if (!isOpen) open(); }}
          onClick={() => { if (!isOpen) open(); }}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') close(); }}
          className={`${INPUT_CLASS} pr-12 ${isOpen ? 'border-indigo-400 ring-2 ring-indigo-400' : ''}`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-1.5 pointer-events-none">
          {value && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={e => { e.preventDefault(); onChange(undefined); setQuery(''); }}
              className="pointer-events-auto p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>
      {dropdown}
    </div>
  );
}
