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
