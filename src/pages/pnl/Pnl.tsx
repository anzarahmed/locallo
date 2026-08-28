import { useEffect, useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, ListChecks } from 'lucide-react';
import { getPnlSummary, getExpenses } from '../../services/pnlService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import type { PnlPeriod, PnlSummary, Expense } from '../../types';

const EXPENSE_ROW_LIMIT = 100;

interface PeriodTab {
  value: PnlPeriod;
  label: string;
}

const PERIODS: PeriodTab[] = [
  { value: 'today',          label: 'Today' },
  { value: 'this_month',     label: 'This Month' },
  { value: 'this_quarter',   label: 'This Quarter' },
  { value: 'financial_year', label: 'Financial Year' },
  { value: 'custom',         label: 'Custom' },
];

function currentFyStartYear(): number {
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Pnl(): JSX.Element {
  const toast = useToast();

  const [period, setPeriod] = useState<PnlPeriod>('financial_year');
  const [fyYear, setFyYear] = useState(currentFyStartYear());
  const [customFrom, setCustomFrom] = useState(todayIso());
  const [customTo, setCustomTo] = useState(todayIso());

  const [summary, setSummary] = useState<PnlSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      if (period === 'custom' && (!customFrom || !customTo)) return;

      setLoadingSummary(true);
      setLoadingExpenses(true);
      try {
        const data = await getPnlSummary({
          period,
          fy: period === 'financial_year' ? fyYear : undefined,
          from: period === 'custom' ? customFrom : undefined,
          to: period === 'custom' ? customTo : undefined,
        });
        setSummary(data);

        const expensesData = await getExpenses({
          page: 1,
          limit: EXPENSE_ROW_LIMIT,
          from: data.from,
          to: data.to,
        });
        setExpenses(expensesData.expenses);
        setTotalExpenses(expensesData.total);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load P&L data');
      } finally {
        setLoadingSummary(false);
        setLoadingExpenses(false);
      }
    }
    void load();
  }, [period, fyYear, customFrom, customTo]); // toast is stable

  const isProfit = (summary?.netProfitLoss ?? 0) >= 0;

  const drRows: { label: string; amount: number; id?: string }[] = summary
    ? [
        ...(summary.openingStockValue > 0
          ? [{ label: 'To Opening Stock', amount: summary.openingStockValue }]
          : []),
        { label: 'To Purchase', amount: summary.totalCost },
        ...expenses.map(e => ({
          id: e.id,
          label: e.ledger?.name ?? 'Ledger',
          amount: e.amount,
        })),
        ...(isProfit && summary.netProfitLoss > 0
          ? [{ label: 'To Net Profit c/d', amount: summary.netProfitLoss }]
          : []),
      ]
    : [];

  const crRows: { label: string; amount: number }[] = summary
    ? [
        { label: 'By Sales', amount: summary.totalSales },
        { label: 'By Closing Stock', amount: summary.closingStockValue },
        ...(!isProfit ? [{ label: 'By Net Loss c/d', amount: Math.abs(summary.netProfitLoss) }] : []),
      ]
    : [];

  const totalDr = drRows.reduce((sum, row) => sum + row.amount, 0);
  const totalCr = crRows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Teal header */}
      <div
        className="px-6 md:px-8 pt-8 pb-16"
        style={{
          background: 'linear-gradient(150deg, #26B8B2 0%, #1A9E98 45%, #14817C 100%)',
          borderRadius: '0 0 28px 28px',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Wallet size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold leading-tight">Profit &amp; Loss</h1>
              {summary && !loadingSummary && (
                <p className="text-white/70 text-sm mt-0.5">
                  {formatDate(summary.from)} – {formatDate(summary.to)}
                </p>
              )}
            </div>
          </div>
          <Link
            to="/expenses"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-white/15 hover:bg-white/25 transition-colors shrink-0"
          >
            <ListChecks size={14} /> Manage Expenses
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-8 -mt-8 relative z-10 pb-8 space-y-4">
        {/* Period pills */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 flex flex-wrap items-center gap-2">
          {PERIODS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setPeriod(tab.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                period === tab.value
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {period === 'financial_year' && (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => setFyYear(y => y - 1)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm font-semibold text-gray-600 px-1 whitespace-nowrap">
                FY {fyYear}-{String((fyYear + 1) % 100).padStart(2, '0')}
              </span>
              <button
                onClick={() => setFyYear(y => y + 1)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(e) => setCustomTo(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600"
              />
            </div>
          )}
        </div>

        {/* Ledger table card */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-gray-800">Profit &amp; Loss Account</h2>
            <p className="text-xs text-gray-400">Traditional accounting view</p>
          </div>

          {loadingSummary || loadingExpenses ? (
            <TableSkeleton />
          ) : summary ? (
            <>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-2 gap-4 min-w-[420px]">
                  {/* Dr column */}
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100 pb-2 mb-2">
                      <span>Particulars (Dr.)</span>
                      <span>Amount</span>
                    </div>
                    <div className="space-y-2 flex-1">
                      {drRows.map((row, i) => (
                        <div key={row.id ?? i} className="flex justify-between items-start gap-2 text-sm">
                          <span className={`text-gray-600 ${row.label.startsWith('To Net Profit') ? 'font-semibold text-emerald-600' : ''}`}>
                            {row.label}
                          </span>
                          <span className={row.label.startsWith('To Net Profit') ? 'font-semibold text-emerald-600 shrink-0' : 'text-gray-700 shrink-0'}>
                            {formatCurrency(row.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm font-bold text-gray-800 border-t border-gray-200 mt-3 pt-2">
                      <span>Total</span>
                      <span>{formatCurrency(totalDr)}</span>
                    </div>
                  </div>

                  {/* Cr column */}
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100 pb-2 mb-2">
                      <span>Particulars (Cr.)</span>
                      <span>Amount</span>
                    </div>
                    <div className="space-y-2 flex-1">
                      {crRows.map((row, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className={row.label.startsWith('By Net Loss') ? 'font-semibold text-rose-600' : 'text-gray-600'}>
                            {row.label}
                          </span>
                          <span className={row.label.startsWith('By Net Loss') ? 'font-semibold text-rose-600' : 'text-gray-700'}>
                            {formatCurrency(row.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-sm font-bold text-gray-800 border-t border-gray-200 mt-3 pt-2">
                      <span>Total</span>
                      <span>{formatCurrency(totalCr)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {totalExpenses > expenses.length && (
                <p className="text-[11px] text-gray-400 mt-3">
                  Showing latest {expenses.length} of {totalExpenses} expenses for this period
                </p>
              )}
            </>
          ) : null}
        </div>

        {/* Summary strip */}
        {summary && !loadingSummary && (
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Gross Profit" value={formatCurrency(summary.grossProfit)} tone={summary.grossProfit >= 0 ? 'positive' : 'negative'} />
            <StatBox label="Total Expenses" value={formatCurrency(summary.totalExpenses)} tone="neutral" />
            <StatBox
              label={isProfit ? 'Net Profit' : 'Net Loss'}
              value={formatCurrency(Math.abs(summary.netProfitLoss))}
              tone={isProfit ? 'positive' : 'negative'}
              icon={isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
  sub,
  icon,
}: {
  label: string;
  value: string;
  tone: 'positive' | 'negative' | 'neutral';
  sub?: string;
  icon?: JSX.Element;
}): JSX.Element {
  const toneCls = tone === 'positive' ? 'text-emerald-600' : tone === 'negative' ? 'text-rose-600' : 'text-gray-700';
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <p className="text-[11px] text-gray-400 font-medium mb-1 flex items-center gap-1">{icon}{label}</p>
      <p className={`text-lg font-bold ${toneCls}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-300 mt-0.5">{sub}</p>}
    </div>
  );
}

function TableSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4 animate-pulse">
      {[0, 1].map(col => (
        <div key={col} className="space-y-2.5">
          <div className="h-3 bg-gray-100 rounded w-2/3 mb-1" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-3.5 bg-gray-100 rounded w-1/2" />
              <div className="h-3.5 bg-gray-100 rounded w-1/5" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
