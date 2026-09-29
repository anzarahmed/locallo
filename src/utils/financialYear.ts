import {
  getIstDateParts,
  getIstDateString,
  getIstEndOfDay,
  getIstMonthRange,
  getIstStartOfDay,
  istCalendarDateToUtc,
  parseIstDateString,
} from './istDate';

export type PnlPeriod = 'today' | 'this_month' | 'this_quarter' | 'financial_year' | 'custom';

export interface PeriodRange {
  from: Date;
  to: Date;
}

export function toIsoDateString(d: Date): string {
  return getIstDateString(d);
}

export function getFinancialYearRange(fyStartYear?: number): PeriodRange {
  const { year, month } = getIstDateParts(new Date());
  const currentFyStartYear = month >= 4 ? year : year - 1;
  const startYear = fyStartYear ?? currentFyStartYear;
  return {
    from: istCalendarDateToUtc(startYear, 4, 1, 0, 0, 0, 0),
    to: istCalendarDateToUtc(startYear + 1, 3, 31, 23, 59, 59, 999),
  };
}

export interface ResolvePeriodOptions {
  fy?: number;
  from?: string;
  to?: string;
}

export function resolvePeriodRange(period: PnlPeriod, opts: ResolvePeriodOptions = {}): PeriodRange {
  const now = new Date();

  switch (period) {
    case 'today':
      return { from: getIstStartOfDay(now), to: getIstEndOfDay(now) };

    case 'this_month':
      return getIstMonthRange(now);

    case 'this_quarter': {
      const { year, month } = getIstDateParts(now);
      const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
      const quarterEndMonth = quarterStartMonth + 2;
      const lastDay = new Date(Date.UTC(year, quarterEndMonth, 0)).getUTCDate();
      return {
        from: istCalendarDateToUtc(year, quarterStartMonth, 1, 0, 0, 0, 0),
        to: istCalendarDateToUtc(year, quarterEndMonth, lastDay, 23, 59, 59, 999),
      };
    }

    case 'financial_year':
      return getFinancialYearRange(opts.fy);

    case 'custom': {
      if (!opts.from || !opts.to) {
        throw Object.assign(new Error('from and to are required for a custom period'), { status: 400 });
      }
      const fromParts = parseIstDateString(opts.from);
      const toParts = parseIstDateString(opts.to);
      return {
        from: istCalendarDateToUtc(fromParts.year, fromParts.month, fromParts.day, 0, 0, 0, 0),
        to: istCalendarDateToUtc(toParts.year, toParts.month, toParts.day, 23, 59, 59, 999),
      };
    }

    default:
      throw Object.assign(new Error('Invalid period'), { status: 400 });
  }
}
