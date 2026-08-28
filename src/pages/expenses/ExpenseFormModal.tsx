import { useState, type JSX } from 'react';
import { useFormik } from 'formik';
import type { FormikHelpers } from 'formik';
import { X, Plus, ChevronDown } from 'lucide-react';
import { createExpense, updateExpense, createLedger } from '../../services/pnlService';
import { expenseSchema, type ExpenseFormValues } from '../../validation/pnlSchemas';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../lib/axios';
import type { Ledger, Expense } from '../../types';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function inputCls(hasError: boolean): string {
  return `w-full px-3 py-2.5 text-sm rounded-xl border outline-none transition-colors ${
    hasError
      ? 'border-red-400 bg-red-50'
      : 'border-gray-200 bg-white focus:border-teal-400'
  }`;
}

interface ExpenseFormModalProps {
  expense: Expense | null;
  ledgers: Ledger[];
  onLedgerCreated: (ledger: Ledger) => void;
  onSaved: (expense: Expense) => void;
  onClose: () => void;
}

export default function ExpenseFormModal({
  expense,
  ledgers,
  onLedgerCreated,
  onSaved,
  onClose,
}: ExpenseFormModalProps): JSX.Element {
  const toast = useToast();
  const isEdit = expense !== null;
  const [showNewLedger, setShowNewLedger] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');
  const [creatingLedger, setCreatingLedger] = useState(false);

  const form = useFormik<ExpenseFormValues>({
    initialValues: {
      ledgerId: expense?.ledgerId ?? '',
      amount: expense?.amount ?? 0,
      description: expense?.description ?? '',
      expenseDate: expense ? expense.expenseDate.slice(0, 10) : todayIso(),
    },
    validationSchema: expenseSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  async function handleSubmit(values: ExpenseFormValues, helpers: FormikHelpers<ExpenseFormValues>): Promise<void> {
    const payload = {
      ledgerId: values.ledgerId,
      amount: Number(values.amount),
      description: values.description || undefined,
      expenseDate: values.expenseDate,
    };
    try {
      const { expense: saved } = isEdit
        ? await updateExpense(expense.id, payload)
        : await createExpense(payload);
      toast.success(isEdit ? 'Expense updated' : 'Expense recorded');
      onSaved(saved);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save expense');
    } finally {
      helpers.setSubmitting(false);
    }
  }

  async function handleCreateLedger(): Promise<void> {
    const name = newLedgerName.trim();
    if (!name) return;
    setCreatingLedger(true);
    try {
      const { ledger } = await createLedger(name);
      onLedgerCreated(ledger);
      form.setFieldValue('ledgerId', ledger.id);
      setNewLedgerName('');
      setShowNewLedger(false);
      toast.success('Ledger created');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create ledger');
    } finally {
      setCreatingLedger(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-800">{isEdit ? 'Edit Expense' : 'Add Expense'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form noValidate onSubmit={form.handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Ledger</label>
            {!showNewLedger ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    name="ledgerId"
                    value={form.values.ledgerId}
                    onChange={form.handleChange}
                    onBlur={form.handleBlur}
                    className={`w-full appearance-none pr-8 ${inputCls(!!form.touched.ledgerId && !!form.errors.ledgerId)}`}
                  >
                    <option value="">Select ledger</option>
                    {ledgers.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewLedger(true)}
                  className="shrink-0 w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center hover:bg-teal-100 transition-colors"
                  title="New ledger"
                >
                  <Plus size={18} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLedgerName}
                  onChange={(e) => setNewLedgerName(e.target.value)}
                  placeholder="Ledger name"
                  className={inputCls(false)}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => void handleCreateLedger()}
                  disabled={creatingLedger || !newLedgerName.trim()}
                  className="shrink-0 px-3 rounded-xl bg-teal-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {creatingLedger ? '…' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewLedger(false); setNewLedgerName(''); }}
                  className="shrink-0 w-10 h-10 rounded-xl border border-gray-200 text-gray-500 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {form.touched.ledgerId && form.errors.ledgerId && (
              <p className="mt-1 text-xs text-red-500">{form.errors.ledgerId}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Amount (₹)</label>
            <input
              type="number"
              name="amount"
              value={form.values.amount}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              className={inputCls(!!form.touched.amount && !!form.errors.amount)}
            />
            {form.touched.amount && form.errors.amount && (
              <p className="mt-1 text-xs text-red-500">{form.errors.amount}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Date</label>
            <input
              type="date"
              name="expenseDate"
              value={form.values.expenseDate}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              className={inputCls(!!form.touched.expenseDate && !!form.errors.expenseDate)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Narration (optional)</label>
            <input
              type="text"
              name="description"
              value={form.values.description}
              onChange={form.handleChange}
              onBlur={form.handleBlur}
              className={inputCls(false)}
            />
          </div>

          <button
            type="submit"
            disabled={form.isSubmitting}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #26B8B2 0%, #14817C 100%)' }}
          >
            {form.isSubmitting ? 'Saving…' : 'Save Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}
