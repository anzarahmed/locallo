import {
  useState, useRef, useEffect, useLayoutEffect, useCallback, type JSX, type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Check } from 'lucide-react';

export interface ComboboxOption {
  label: string;
  value: string | number;
}

interface ComboboxFieldProps {
  label: string;
  name: string;
  value: string | number;
  options: ComboboxOption[];
  onChange: (value: string | number) => void;
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

export default function ComboboxField({
  label, name, value, options, onChange, onBlur,
  placeholder = 'Select…', touched, error, required,
}: ComboboxFieldProps): JSX.Element {
  const [isOpen, setIsOpen]             = useState(false);
  const [query, setQuery]               = useState('');
  const [activeIndex, setActiveIndex]   = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<DropdownStyle | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLUListElement>(null);
  const onBlurRef  = useRef(onBlur);
  useEffect(() => { onBlurRef.current = onBlur; }, [onBlur]);

  const selectedOption = options.find(o => o.value === value && value !== '' && value !== 0);
  const invalid        = touched === true && Boolean(error);
  const filtered       = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const calcPosition = useCallback((): DropdownStyle | null => {
    if (!inputRef.current) return null;
    const rect            = inputRef.current.getBoundingClientRect();
    const viewportHeight  = window.innerHeight;
    const DROPDOWN_HEIGHT = 232;
    const GAP             = 4;
    const spaceBelow      = viewportHeight - rect.bottom;
    const showAbove       = spaceBelow < DROPDOWN_HEIGHT && rect.top > DROPDOWN_HEIGHT;

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

  // Close on outside click — must check both the input wrapper and the portal list
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

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    (listRef.current.children[activeIndex] as HTMLElement | undefined)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function openDropdown(): void {
    setIsOpen(true);
    setQuery('');
    setActiveIndex(-1);
  }

  function closeDropdown(): void {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(-1);
    onBlurRef.current?.();
  }

  function selectOption(opt: ComboboxOption): void {
    onChange(opt.value);
    setIsOpen(false);
    setQuery('');
    setActiveIndex(-1);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) { openDropdown(); return; }
        setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && activeIndex >= 0 && filtered[activeIndex]) {
          selectOption(filtered[activeIndex]);
        } else if (!isOpen) {
          openDropdown();
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;
      case 'Tab':
        if (isOpen) closeDropdown();
        break;
    }
  }

  const dropdown = isOpen && dropdownStyle
    ? createPortal(
        <ul
          ref={listRef}
          id={`${name}-listbox`}
          role="listbox"
          style={dropdownStyle}
          className="bg-white border border-gray-200 rounded-xl shadow-2xl max-h-[232px] overflow-y-auto py-1 outline-none"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-gray-400 italic text-center">No results</li>
          ) : (
            filtered.map((opt, i) => {
              const isSelected = opt.value === value;
              const isActive   = i === activeIndex;
              return (
                <li
                  key={opt.value}
                  id={`${name}-opt-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={e => { e.preventDefault(); selectOption(opt); }}
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
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <div ref={wrapperRef} className="relative">
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
          placeholder={isOpen ? 'Type to search…' : placeholder}
          value={isOpen ? query : (selectedOption?.label ?? '')}
          onFocus={() => { if (!isOpen) openDropdown(); }}
          onClick={() => { if (!isOpen) openDropdown(); }}
          onChange={e => { setQuery(e.target.value); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
          className={`w-full px-3.5 py-2.5 pr-16 border rounded-lg text-sm text-gray-900 bg-white
            focus:outline-none focus:ring-2 focus:border-transparent transition-shadow cursor-text
            ${invalid
              ? 'border-red-400 focus:ring-red-400 bg-red-50'
              : isOpen
              ? 'border-indigo-400 ring-2 ring-indigo-500'
              : 'border-gray-300 hover:border-gray-400'
            }`}
        />

        {/* right-side controls — pointer-events-none on container so clicks pass to input */}
        <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-2.5 pointer-events-none">
          {selectedOption && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={e => { e.preventDefault(); onChange(''); setQuery(''); }}
              aria-label="Clear selection"
              className="pointer-events-auto p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {invalid && (
        <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      )}

      {dropdown}
    </div>
  );
}
