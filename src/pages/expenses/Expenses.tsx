import { useEffect, useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wallet, Plus, BookOpen, Pencil, Trash2, Receipt, Calendar, X } from 'lucide-react';
import { getExpenses, deleteExpense, getLedgers } from '../../services/pnlService';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import { PAGE_LIMIT } from '../../constants';
import type { Expense, Ledger } from '../../types';
import ExpenseFormModal from './ExpenseFormModal';
import LedgerManagerModal from './LedgerManagerModal';
import ConfirmDeleteModal from '../../components/ui/ConfirmDeleteModal';

function formatCurrency(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Expenses(): JSX.Element {
  const toast = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>(todayIso());

  const [ledgers, setLedgers] = useState<Ledger[]>([]);

  const [formTarget, setFormTarget] = useState<Expense | 'new' | null>(null);
  const [showLedgerManager, setShowLedgerManager] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const { ledgers: rows } = await getLedgers();
        setLedgers(rows);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load ledgers');
      }
    }
    void load();
  }, []); // toast is stable

  useEffect(() => {
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const data = await getExpenses({
          page,
          limit: PAGE_LIMIT,
          from: dateFilter || undefined,
          to: dateFilter || undefined,
        });
        setExpenses(data.expenses);
        setTotal(data.total);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load expenses');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [page, dateFilter]); // toast is stable

  function handleDateChange(value: string): void {
    setDateFilter(value);
    setPage(1);
  }

  function handleSaved(expense: Expense): void {
    setFormTarget(null);
    const existed = expenses.some(e => e.id === expense.id);
    const matchesFilter = !dateFilter || expense.expenseDate.slice(0, 10) === dateFilter;

    setExpenses(prev => {
      if (!matchesFilter) return prev.filter(e => e.id !== expense.id);
      const exists = prev.some(e => e.id === expense.id);
      return exists ? prev.map(e => (e.id === expense.id ? expense : e)) : [expense, ...prev];
    });

    if (existed && !matchesFilter) setTotal(t => t - 1);
    else if (!existed && matchesFilter) setTotal(t => t + 1);
  }

  async function handleConfirmDelete(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExpense(deleteTarget.id);
      toast.success('Expense deleted');
      setExpenses(prev => prev.filter(e => e.id !== deleteTarget.id));
      setTotal(t => t - 1);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete expense');
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_LIMIT);

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
        <Link to="/pnl" className="inline-flex items-center gap-1 text-white/70 text-sm mb-3 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Back to P&amp;L
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold leading-tight">Expenses</h1>
            {!loading && (
              <p className="text-white/70 text-sm mt-0.5">
                {total} {dateFilter ? `on ${formatDate(dateFilter)}` : 'in total'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-8 -mt-8 relative z-10 pb-8">
        {/* Date filter */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 mb-4 flex items-center gap-2 flex-wrap">
          <Calendar size={15} className="text-gray-400 shrink-0" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => handleDateChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 outline-none focus:border-teal-400 transition-colors"
          />
          {dateFilter ? (
            <button
              onClick={() => handleDateChange('')}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={12} /> View all
            </button>
          ) : (
            <button
              onClick={() => handleDateChange(todayIso())}
              className="text-xs font-semibold text-teal-600 hover:underline px-2 py-1.5"
            >
              Jump to today
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3 mb-4 flex items-center justify-between gap-2">
          <button
            onClick={() => setShowLedgerManager(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            <BookOpen size={15} /> Ledgers
          </button>
          <button
            onClick={() => setFormTarget('new')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #26B8B2 0%, #14817C 100%)' }}
          >
            <Plus size={15} /> Add Expense
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3 mb-4">
            {Array.from({ length: 5 }).map((_, i) => <ExpenseSkeleton key={i} />)}
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState dateFilter={dateFilter} />
        ) : (
          <div className="space-y-3 mb-4">
            {expenses.map(expense => (
              <div key={expense.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
                      {expense.ledger?.name ?? 'Ledger'}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(expense.expenseDate)}</span>
                  </div>
                  {expense.description && (
                    <p className="text-sm text-gray-600 mt-1 truncate">{expense.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-gray-800">{formatCurrency(expense.amount)}</span>
                  <button
                    onClick={() => setFormTarget(expense)}
                    className="text-gray-400 hover:text-teal-600 transition-colors"
                    title="Edit expense"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(expense)}
                    className="text-gray-400 hover:text-rose-500 transition-colors"
                    title="Delete expense"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-white shadow-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-500 px-3">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-white shadow-sm disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {formTarget && (
        <ExpenseFormModal
          expense={formTarget === 'new' ? null : formTarget}
          ledgers={ledgers}
          onLedgerCreated={(l) => setLedgers(prev => [...prev, l])}
          onSaved={handleSaved}
          onClose={() => setFormTarget(null)}
        />
      )}

      {showLedgerManager && (
        <LedgerManagerModal
          ledgers={ledgers}
          onLedgerCreated={(l) => setLedgers(prev => [...prev, l])}
          onLedgerUpdated={(l) => {
            setLedgers(prev => prev.map(existing => (existing.id === l.id ? l : existing)));
            setExpenses(prev => prev.map(e => (e.ledgerId === l.id ? { ...e, ledger: l } : e)));
          }}
          onLedgerDeleted={(id) => setLedgers(prev => prev.filter(l => l.id !== id))}
          onClose={() => setShowLedgerManager(false)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          title="Delete this expense?"
          message={`${deleteTarget.ledger?.name ?? 'Ledger'} — ${formatCurrency(deleteTarget.amount)} will be removed.`}
          loading={deleting}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function ExpenseSkeleton(): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 animate-pulse flex items-center justify-between gap-3">
      <div className="flex-1">
        <div className="h-4 bg-gray-100 rounded w-1/4 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="h-4 bg-gray-100 rounded w-12" />
    </div>
  );
}

function EmptyState({ dateFilter }: { dateFilter: string }): JSX.Element {
  return (
    <div className="bg-white rounded-2xl shadow-sm py-16 text-center mb-4">
      <Receipt size={40} className="text-gray-200 mx-auto mb-3" />
      <p className="text-sm font-semibold text-gray-500">
        {dateFilter ? `No expenses on ${formatDate(dateFilter)}` : 'No expenses recorded yet'}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        {dateFilter ? 'Try a different date or view all' : 'Add your first expense to start tracking costs'}
      </p>
    </div>
  );
}
