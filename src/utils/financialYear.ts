export type PnlPeriod = 'today' | 'this_month' | 'this_quarter' | 'financial_year' | 'custom';

export interface PeriodRange {
  from: Date;
  to: Date;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function getFinancialYearRange(fyStartYear?: number): PeriodRange {
  const now = new Date();
  const currentFyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const startYear = fyStartYear ?? currentFyStartYear;
  return {
    from: new Date(startYear, 3, 1, 0, 0, 0, 0),
    to: endOfDay(new Date(startYear + 1, 2, 31)),
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
      return { from: startOfDay(now), to: endOfDay(now) };

    case 'this_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return { from, to };
    }

    case 'this_quarter': {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      const from = new Date(now.getFullYear(), quarterStartMonth, 1);
      const to = endOfDay(new Date(now.getFullYear(), quarterStartMonth + 3, 0));
      return { from, to };
    }

    case 'financial_year':
      return getFinancialYearRange(opts.fy);

    case 'custom': {
      if (!opts.from || !opts.to) {
        throw Object.assign(new Error('from and to are required for a custom period'), { status: 400 });
      }
      const from = new Date(opts.from);
      const to = new Date(opts.to);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        throw Object.assign(new Error('Invalid from/to date'), { status: 400 });
      }
      return { from: startOfDay(from), to: endOfDay(to) };
    }

    default:
      throw Object.assign(new Error('Invalid period'), { status: 400 });
  }
}
