import { useCallback, useEffect, useRef, useState, type CSSProperties, type JSX, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { inputCls } from '../../lib/classUtils';
import type { SellerCategory, CategoryLimit } from '../../types';

interface CategorySelectProps {
  value: number;
  categories: SellerCategory[];
  limits: Map<number, CategoryLimit>;
  onChange: (id: number) => void;
  onBlur?: () => void;
  hasError?: boolean;
}

const MAX_LIST_HEIGHT = 288;
const GAP = 4;

function isFull(limit: CategoryLimit | undefined): boolean {
  return limit?.remaining === 0;
}

export default function CategorySelect({
  value, categories, limits, onChange, onBlur, hasError = false,
}: CategorySelectProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [listStyle, setListStyle] = useState<CSSProperties | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selected = categories.find(c => c.id === value);

  const calcPosition = useCallback((): CSSProperties | null => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const showAbove = viewportHeight - rect.bottom < MAX_LIST_HEIGHT && rect.top > viewportHeight - rect.bottom;
    return {
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      maxHeight: MAX_LIST_HEIGHT,
      zIndex: 9999,
      ...(showAbove ? { bottom: viewportHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
    };
  }, []);

  const close = useCallback((): void => {
    setIsOpen(false);
    // Deferred so Formik's setFieldTouched validates against a just-selected value,
    // not the stale values captured in its last render.
    setTimeout(() => onBlur?.(), 0);
  }, [onBlur]);

  useEffect(() => {
    if (!isOpen) return;
    const update = (): void => setListStyle(calcPosition());
    const handleOutside = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      close();
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    document.addEventListener('mousedown', handleOutside);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [isOpen, calcPosition, close]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex]);

  function open(): void {
    setListStyle(calcPosition());
    setActiveIndex(Math.max(0, categories.findIndex(c => c.id === value)));
    setIsOpen(true);
  }

  function select(cat: SellerCategory): void {
    if (isFull(limits.get(cat.id))) return;
    onChange(cat.id);
    close();
  }

  function moveActive(delta: number): void {
    if (categories.length === 0) return;
    setActiveIndex(i => (i + delta + categories.length) % categories.length);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>): void {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const cat = categories[activeIndex];
      if (cat) select(cat);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      close();
    }
  }

  const list = isOpen && listStyle
    ? createPortal(
        <ul
          ref={listRef}
          role="listbox"
          style={listStyle}
          className="overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-2xl py-1"
        >
          {categories.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-400">No categories assigned</li>
          )}
          {categories.map((cat, i) => {
            const limit = limits.get(cat.id);
            const full = isFull(limit);
            const isSelected = cat.id === value;
            return (
              <li
                key={cat.id}
                role="option"
                aria-selected={isSelected}
                aria-disabled={full}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => select(cat)}
                className={`flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors ${
                  full
                    ? 'text-gray-300 cursor-not-allowed'
                    : `cursor-pointer text-gray-800 ${isSelected ? 'bg-teal-50 font-medium' : i === activeIndex ? 'bg-gray-100' : ''}`
                }`}
              >
                <span className="truncate">{cat.name}</span>
                {limit && (
                  <span className={`shrink-0 text-xs ${full ? 'text-rose-400' : 'text-gray-500'}`}>
                    {limit.used}/{limit.limit} used
                  </span>
                )}
              </li>
            );
          })}
        </ul>,
        document.body,
      )
    : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleKeyDown}
        className={`${inputCls(hasError)} block text-left pr-8 truncate`}
      >
        {selected ? selected.name : <span className="text-gray-400">Select a category</span>}
      </button>
      <ChevronDown
        size={14}
        className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform ${isOpen ? 'rotate-180' : ''}`}
      />
      {list}
    </div>
  );
}
