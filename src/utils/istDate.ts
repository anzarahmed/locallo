import type { DayOfWeek } from '../types';

const IST_TIME_ZONE = 'Asia/Kolkata';

const DAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: IST_TIME_ZONE,
  weekday: 'long',
});

const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function getIstDateString(date: Date = new Date()): string {
  return DATE_FORMATTER.format(date);
}

export function getIstDayOfWeek(date: Date = new Date()): DayOfWeek {
  return DAY_FORMATTER.format(date).toLowerCase() as DayOfWeek;
}

export function isIstDateTodayOrFuture(dateStr: string): boolean {
  return dateStr >= getIstDateString();
}

export interface IstDateParts {
  year: number;
  month: number;
  day: number;
}

export function getIstDateParts(date: Date = new Date()): IstDateParts {
  const [year, month, day] = getIstDateString(date).split('-').map(Number);
  return { year, month, day };
}

export function parseIstDateString(dateStr: string): IstDateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    throw Object.assign(new Error(`Invalid date string: ${dateStr}`), { status: 400 });
  }
  const [, year, month, day] = match;
  return { year: Number(year), month: Number(month), day: Number(day) };
}

// Builds the absolute UTC instant for a given IST calendar date/time by embedding the
// fixed +05:30 offset directly in the ISO string being parsed — correct regardless of
// the host process's own timezone (India has no DST, so the offset never changes).
export function istCalendarDateToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  ms = 0,
): Date {
  const pad = (n: number, len = 2): string => String(n).padStart(len, '0');
  const iso = `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}.${pad(ms, 3)}+05:30`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw Object.assign(new Error(`Invalid IST calendar date: ${iso}`), { status: 400 });
  }
  return date;
}

export function getIstStartOfDay(date: Date = new Date()): Date {
  const { year, month, day } = getIstDateParts(date);
  return istCalendarDateToUtc(year, month, day, 0, 0, 0, 0);
}

export function getIstEndOfDay(date: Date = new Date()): Date {
  const { year, month, day } = getIstDateParts(date);
  return istCalendarDateToUtc(year, month, day, 23, 59, 59, 999);
}

export interface DateRange {
  from: Date;
  to: Date;
}

export function getIstMonthRange(date: Date = new Date()): DateRange {
  const { year, month } = getIstDateParts(date);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    from: istCalendarDateToUtc(year, month, 1, 0, 0, 0, 0),
    to: istCalendarDateToUtc(year, month, lastDay, 23, 59, 59, 999),
  };
}
