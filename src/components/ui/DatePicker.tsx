import {
  useState, useRef, useEffect, useCallback, type JSX, type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { isoToDisplayDate, parseDisplayDate, toDate, toIsoDate } from '../../lib/dateFormat';

interface DatePickerProps {
  label?: string;
  name: string;
  /** YYYY-MM-DD, or '' when empty */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  min?: string;
  max?: string;
  placeholder?: string;
  touched?: boolean;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** Style the input as invalid but let the parent render the message */
  hideErrorText?: boolean;
}

interface PopoverStyle {
  position: 'fixed';
  left: number;
  zIndex: number;
  top?: number;
  bottom?: number;
}

interface DayCell {
  iso: string;
  day: number;
  inMonth: boolean;
}

const WEEKDAYS: string[] = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS: string[] = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const POPOVER_HEIGHT = 330;
const POPOVER_WIDTH = 288;

function maskTyping(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function buildMonthGrid(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { iso: toIsoDate(d), day: d.getDate(), inMonth: d.getMonth() === month };
  });
}

function isOutOfRange(iso: string, min?: string, max?: string): boolean {
  return (min !== undefined && min !== '' && iso < min) || (max !== undefined && max !== '' && iso > max);
}

export default function DatePicker({
  label, name, value, onChange, onBlur, min, max,
  placeholder = 'DD/MM/YYYY', touched, error, required, disabled, hideErrorText,
}: DatePickerProps): JSX.Element {
  const [isOpen, setIsOpen]   = useState(false);
  const [text, setText]       = useState(isoToDisplayDate(value));
  const [viewYear, setViewYear]   = useState(() => toDate(value || toIsoDate(new Date())).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => toDate(value || toIsoDate(new Date())).getMonth());
  const [popoverStyle, setPopoverStyle] = useState<PopoverStyle | null>(null);

  const inputRef  = useRef<HTMLInputElement>(null);
  const onBlurRef = useRef(onBlur);
  useEffect(() => { onBlurRef.current = onBlur; }, [onBlur]);
  const invalid  = touched === true && Boolean(error);
  const todayIso = toIsoDate(new Date());

  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(isoToDisplayDate(value));
  }

  const calcPosition = useCallback((): PopoverStyle | null => {
    if (!inputRef.current) return null;
    const rect           = inputRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const GAP            = 4;
    const showAbove      = viewportHeight - rect.bottom < POPOVER_HEIGHT && rect.top > POPOVER_HEIGHT;
    const left           = Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8));
    return {
      position: 'fixed',
      left,
      zIndex: 9999,
      ...(showAbove ? { bottom: viewportHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const update = (): void => setPopoverStyle(calcPosition());
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, calcPosition]);

  function open(): void {
    if (disabled || isOpen) return;
    const base = toDate(value || (min && todayIso < min ? min : todayIso));
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setPopoverStyle(calcPosition());
    setIsOpen(true);
  }

  function commitText(): void {
    if (text.trim() === '') {
      if (value !== '') onChange('');
      return;
    }
    const iso = parseDisplayDate(text);
    if (iso && !isOutOfRange(iso, min, max)) {
      if (iso !== value) onChange(iso);
      setText(isoToDisplayDate(iso));
    } else {
      setText(isoToDisplayDate(value));
    }
  }

  function selectDay(iso: string): void {
    onChange(iso);
    setText(isoToDisplayDate(iso));
    setIsOpen(false);
  }

  function shiftMonth(delta: number): void {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function handleBlur(): void {
    commitText();
    setIsOpen(false);
    // Deferred so Formik's setFieldTouched validates against the value committed above,
    // not the stale values captured in its last render.
    setTimeout(() => onBlurRef.current?.(), 0);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitText();
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      open();
    }
  }

  const grid = buildMonthGrid(viewYear, viewMonth);

  const popover = isOpen && popoverStyle
    ? createPortal(
        // preventDefault keeps focus on the input so its blur only fires when leaving the picker
        <div
          style={{ ...popoverStyle, width: POPOVER_WIDTH }}
          onMouseDown={e => e.preventDefault()}
          className="bg-white border border-gray-200 rounded-xl shadow-2xl p-3 select-none"
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(w => (
              <span key={w} className="text-center text-[11px] font-medium text-gray-400 py-1">{w}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {grid.map(cell => {
              const disabledDay = isOutOfRange(cell.iso, min, max);
              const selected    = cell.iso === value;
              const isToday     = cell.iso === todayIso;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => selectDay(cell.iso)}
                  className={`h-9 rounded-lg text-sm transition-colors ${
                    selected
                      ? 'bg-indigo-600 text-white font-semibold'
                      : disabledDay
                      ? 'text-gray-300 cursor-not-allowed'
                      : `${cell.inMonth ? 'text-gray-800' : 'text-gray-400'} hover:bg-indigo-50 ${
                          isToday ? 'ring-1 ring-inset ring-indigo-400 font-semibold' : ''
                        }`
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            {!required && value !== '' ? (
              <button
                type="button"
                onClick={() => { onChange(''); setText(''); setIsOpen(false); }}
                className="text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                Clear
              </button>
            ) : <span />}
            <button
              type="button"
              disabled={isOutOfRange(todayIso, min, max)}
              onClick={() => selectDay(todayIso)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded-md hover:bg-indigo-50 disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
            >
              Today
            </button>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          disabled={disabled}
          value={text}
          onFocus={open}
          onClick={open}
          onChange={e => setText(maskTyping(e.target.value))}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full px-3.5 py-2.5 pr-10 border rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white
            focus:outline-none focus:ring-2 focus:border-transparent transition-shadow disabled:bg-gray-50 disabled:text-gray-400
            ${invalid ? 'border-red-400 focus:ring-red-400 bg-red-50' : 'border-gray-300 focus:ring-indigo-500'}`}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onMouseDown={e => { e.preventDefault(); inputRef.current?.focus(); open(); }}
          aria-label="Open calendar"
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {invalid && !hideErrorText && (
        <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      )}

      {popover}
    </div>
  );
}
