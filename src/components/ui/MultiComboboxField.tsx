import {
  useState, useRef, useEffect, useLayoutEffect, useCallback, type JSX, type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Check } from 'lucide-react';
import type { ComboboxOption } from './ComboboxField';

interface MultiComboboxFieldProps {
  label: string;
  name: string;
  value: number[];
  options: ComboboxOption[];
  onChange: (values: number[]) => void;
  onBlur?: () => void;
  placeholder?: string;
  touched?: boolean;
  error?: string;
  required?: boolean;
}

interface DropdownStyle {
  position: 'fixed';
  left: number;
  width: number;
  zIndex: number;
  top?: number;
  bottom?: number;
}

export default function MultiComboboxField({
  label, name, value, options, onChange, onBlur,
  placeholder = 'Select…', touched, error, required,
}: MultiComboboxFieldProps): JSX.Element {
  const [isOpen, setIsOpen]             = useState(false);
  const [query, setQuery]               = useState('');
  const [activeIndex, setActiveIndex]   = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<DropdownStyle | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLUListElement>(null);
  const onBlurRef  = useRef(onBlur);
  useEffect(() => { onBlurRef.current = onBlur; }, [onBlur]);

  const selectedOptions = options.filter(o => value.includes(Number(o.value)));
  const invalid         = touched === true && Boolean(error);
  const filtered        = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const calcPosition = useCallback((): DropdownStyle | null => {
    if (!wrapperRef.current) return null;
    const rect           = wrapperRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const DROPDOWN_HEIGHT = 232;
    const GAP            = 4;
    const spaceBelow     = viewportHeight - rect.bottom;
    const showAbove      = spaceBelow < DROPDOWN_HEIGHT && rect.top > DROPDOWN_HEIGHT;

    return {
      position: 'fixed',
      left: rect.left,
      width: rect.width,
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
        setActiveIndex(-1);
        onBlurRef.current?.();
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    (listRef.current.children[activeIndex] as HTMLElement | undefined)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function toggleOption(optValue: number): void {
    if (value.includes(optValue)) {
      onChange(value.filter(v => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
    setQuery('');
    setActiveIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) { setIsOpen(true); return; }
        setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && activeIndex >= 0 && filtered[activeIndex]) {
          toggleOption(Number(filtered[activeIndex].value));
        } else if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        setActiveIndex(-1);
        onBlurRef.current?.();
        break;
      case 'Backspace':
        if (query === '' && value.length > 0) {
          onChange(value.slice(0, -1));
        }
        break;
      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
          setQuery('');
          setActiveIndex(-1);
          onBlurRef.current?.();
        }
        break;
    }
  }

  const dropdown = isOpen && dropdownStyle
    ? createPortal(
        <ul
          ref={listRef}
          id={`${name}-listbox`}
          role="listbox"
          aria-multiselectable="true"
          style={dropdownStyle}
          className="bg-white border border-gray-200 rounded-xl shadow-2xl max-h-[232px] overflow-y-auto py-1 outline-none"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400 italic text-center">No results</li>
          ) : (
            filtered.map((opt, i) => {
              const isSelected = value.includes(Number(opt.value));
              const isActive   = i === activeIndex;
              return (
                <li
                  key={opt.value}
                  id={`${name}-opt-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={e => { e.preventDefault(); toggleOption(Number(opt.value)); }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex items-center justify-between mx-1 px-3 py-2.5 rounded-lg text-sm cursor-pointer select-none transition-colors ${
                    isActive && isSelected
                      ? 'bg-indigo-100 text-indigo-800'
                      : isActive
                      ? 'bg-gray-100 text-gray-900'
                      : isSelected
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />
                  )}
                </li>
              );
            })
          )}
        </ul>,
        document.body,
      )
    : null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <div
        ref={wrapperRef}
        onClick={() => { if (!isOpen) { setIsOpen(true); inputRef.current?.focus(); } }}
        className={`flex flex-wrap items-center gap-1.5 px-3 py-2 border rounded-lg cursor-text min-h-[42px] transition-shadow ${
          invalid
            ? 'border-red-400 bg-red-50'
            : isOpen
            ? 'border-indigo-400 ring-2 ring-indigo-500'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
      >
        {selectedOptions.map(opt => (
          <span
            key={opt.value}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-medium shrink-0"
          >
            {opt.label}
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); toggleOption(Number(opt.value)); }}
              className="text-indigo-400 hover:text-indigo-700 transition-colors"
              aria-label={`Remove ${opt.label}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          id={name}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${name}-listbox`}
          aria-activedescendant={activeIndex >= 0 ? `${name}-opt-${activeIndex}` : undefined}
          autoComplete="off"
          placeholder={selectedOptions.length === 0 ? placeholder : isOpen ? 'Search…' : ''}
          value={query}
          onFocus={() => { if (!isOpen) setIsOpen(true); }}
          onChange={e => { setQuery(e.target.value); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[80px] outline-none text-sm bg-transparent text-gray-900 placeholder-gray-400 py-0.5"
        />

        <div className="ml-auto pl-1 shrink-0 pointer-events-none">
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {invalid && (
        <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      )}

      {dropdown}
    </div>
  );
}
