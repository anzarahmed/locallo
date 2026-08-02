import { useState, useEffect, useMemo, type JSX } from 'react';
import { Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useFormik, type FormikHelpers } from 'formik';
import { type ColumnDef, type Row, type SortingState, type ColumnFiltersState } from '@tanstack/react-table';
import DataGrid from '../../components/ui/DataGrid';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import StatusBadge from '../../components/ui/StatusBadge';
import { ApiError } from '../../lib/axios';
import {
  getFaqsPaginated,
  createFaq,
  updateFaq,
  deleteFaq,
  type GetFaqsPaginatedParams,
} from '../../services/faqService';
import type { Faq } from '../../types';
import { faqSchema, type FaqFormValues } from './faqSchemas';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_PAGE_SIZE, STATUS_FILTER_OPTIONS } from '../../lib/constants';

// ── FaqModal ─────────────────────────────────────────────────────────────────

interface FaqModalProps {
  faq: Faq | null;
  onClose: () => void;
  onSaved: (f: Faq) => void;
}

function FaqModal({ faq, onClose, onSaved }: FaqModalProps): JSX.Element {
  const isEdit = Boolean(faq);
  const toast  = useToast();

  const initialValues: FaqFormValues = {
    question: faq?.question ?? '',
    answer: faq?.answer ?? '',
  };

  async function handleSubmit(
    values: FaqFormValues,
    { setSubmitting, setStatus }: FormikHelpers<FaqFormValues>,
  ): Promise<void> {
    try {
      const saved = isEdit && faq
        ? await updateFaq(faq.id, values)
        : await createFaq(values);
      toast.success(isEdit ? 'FAQ updated' : 'FAQ added');
      onSaved(saved);
    } catch {
      setStatus('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const f = useFormik<FaqFormValues>({
    initialValues,
    validationSchema: faqSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit FAQ' : 'Add FAQ'}
          </h2>
        </div>

        <form onSubmit={f.handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {typeof f.status === 'string' && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
                {f.status}
              </div>
            )}

            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1.5">
                Question <span className="text-red-500">*</span>
              </label>
              <textarea
                id="question" name="question" rows={2}
                placeholder="e.g. How do I reset my password?"
                value={f.values.question}
                onChange={f.handleChange} onBlur={f.handleBlur}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${
                  f.touched.question && f.errors.question
                    ? 'border-red-400 focus:ring-red-400 bg-red-50'
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
              />
              {f.touched.question && f.errors.question && (
                <p className="mt-1 text-xs text-red-600" role="alert">{f.errors.question}</p>
              )}
            </div>

            <div>
              <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-1.5">
                Answer <span className="text-red-500">*</span>
              </label>
              <textarea
                id="answer" name="answer" rows={5}
                placeholder="Write the answer shown to users…"
                value={f.values.answer}
                onChange={f.handleChange} onBlur={f.handleBlur}
                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${
                  f.touched.answer && f.errors.answer
                    ? 'border-red-400 focus:ring-red-400 bg-red-50'
                    : 'border-gray-300 focus:ring-indigo-500'
                }`}
              />
              {f.touched.answer && f.errors.answer && (
                <p className="mt-1 text-xs text-red-600" role="alert">{f.errors.answer}</p>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={f.isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {f.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {f.isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add FAQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── DeleteModal ────────────────────────────────────────────────────────────────

interface DeleteModalProps {
  faq: Faq;
  onClose: () => void;
  onDeleted: (id: number) => void;
}

function DeleteModal({ faq, onClose, onDeleted }: DeleteModalProps): JSX.Element {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const toast = useToast();

  async function handleDelete(): Promise<void> {
    setDeleting(true);
    try {
      await deleteFaq(faq.id);
      toast.success('FAQ deleted');
      onDeleted(faq.id);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete. Please try again.';
      setError(message);
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <div className="text-center">
          <h3 className="text-base font-semibold text-gray-900">Delete FAQ?</h3>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            <span className="font-medium text-gray-700">{faq.question}</span> will be permanently removed.
          </p>
        </div>
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={(): void => { void handleDelete(); }}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FaqList ──────────────────────────────────────────────────────────────────

export default function FaqList(): JSX.Element {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [faqs, setFaqs]                 = useState<Faq[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(DEFAULT_PAGE_SIZE);
  const [fetchKey, setFetchKey]         = useState(0);
  const [modalFaq, setModalFaq]         = useState<Faq | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Faq | null>(null);
  const [toggling, setToggling]         = useState<number | null>(null);

  const [sorting, setSorting]                   = useState<SortingState>([]);
  const [columnFilters, setColumnFilters]       = useState<ColumnFiltersState>([]);
  const [debouncedFilters, setDebouncedFilters] = useState<ColumnFiltersState>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(columnFilters);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [columnFilters]);

  useEffect(() => { setPage(1); }, [sorting]);

  useEffect((): void => {
    setLoading(true);
    setError(null);

    const sortCol     = sorting[0];
    const search      = debouncedFilters.find(f => f.id === 'question')?.value as string | undefined;
    const isActiveStr = debouncedFilters.find(f => f.id === 'isActive')?.value as string | undefined;

    const params: GetFaqsPaginatedParams = {
      page,
      limit: pageSize,
      ...(search      && { search }),
      ...(isActiveStr && { isActive: isActiveStr === 'true' }),
      ...(sortCol     && { sortBy: sortCol.id, sortOrder: sortCol.desc ? 'desc' as const : 'asc' as const }),
    };

    getFaqsPaginated(params)
      .then(r => { setFaqs(r.faqs); setTotal(r.total); })
      .catch((): void => { setError('Failed to load FAQs.'); })
      .finally((): void => { setLoading(false); });
  }, [page, pageSize, sorting, debouncedFilters, fetchKey]);

  function handleSaved(saved: Faq): void {
    const isAdd = !faqs.find(f => f.id === saved.id);
    if (isAdd) {
      setPage(1);
      setFetchKey(k => k + 1);
    } else {
      setFaqs(prev => prev.map(f => f.id === saved.id ? saved : f));
    }
    setModalFaq(undefined);
  }

  function handleDeleted(id: number): void {
    setFaqs(prev => prev.filter(f => f.id !== id));
    setTotal(t => t - 1);
    setDeleteTarget(null);
  }

  async function handleToggleActive(faq: Faq): Promise<void> {
    setToggling(faq.id);
    try {
      const updated = await updateFaq(faq.id, { isActive: !faq.isActive });
      setFaqs(prev => prev.map(f => f.id === updated.id ? updated : f));
      toast.success(updated.isActive ? 'FAQ activated' : 'FAQ deactivated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggling(null);
    }
  }

  const columns = useMemo<ColumnDef<Faq>[]>(() => [
    {
      accessorKey: 'question',
      header: 'Question',
      enableSorting: true,
      enableColumnFilter: true,
      meta: { filterPlaceholder: 'Search question…' },
      cell: ({ row }: { row: Row<Faq> }) => (
        <span className="font-medium text-gray-900 line-clamp-2">{row.original.question}</span>
      ),
    },
    {
      accessorKey: 'answer',
      header: 'Answer',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }: { row: Row<Faq> }) => (
        <span className="text-gray-500 line-clamp-2">{row.original.answer}</span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Active',
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        filterVariant: 'select',
        filterOptions: STATUS_FILTER_OPTIONS,
        align: 'center',
        className: 'w-24',
      },
      cell: ({ row }: { row: Row<Faq> }) => {
        const faq = row.original;
        return (
          <div className="flex justify-center">
            {hasPermission('faqs', 'edit') ? (
              <ToggleSwitch
                active={faq.isActive}
                onToggle={toggling === faq.id ? (): void => {} : (): void => { void handleToggleActive(faq); }}
                title={`${faq.isActive ? 'Deactivate' : 'Activate'} FAQ`}
              />
            ) : (
              <StatusBadge active={faq.isActive} />
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { hideFromVisibility: true, align: 'right' },
      cell: ({ row }: { row: Row<Faq> }) => {
        const faq = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {hasPermission('faqs', 'edit') && (
              <button
                onClick={() => setModalFaq(faq)}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {hasPermission('faqs', 'delete') && (
              <button
                onClick={() => setDeleteTarget(faq)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ].filter(col => {
    if (!('id' in col) || col.id !== 'actions') return true;
    return hasPermission('faqs', 'edit') || hasPermission('faqs', 'delete');
  }) as ColumnDef<Faq, unknown>[], [toggling, hasPermission]);

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">FAQs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
        {hasPermission('faqs', 'add') && (
          <button
            onClick={() => setModalFaq(null)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add FAQ
          </button>
        )}
      </div>

      <DataGrid
        columns={columns}
        data={faqs}
        loading={loading}
        skeletonRows={pageSize}
        emptyMessage="No FAQs found."
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: size => { setPageSize(size); setPage(1); } }}
      />

      {modalFaq !== undefined && (
        <FaqModal
          faq={modalFaq}
          onClose={() => setModalFaq(undefined)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          faq={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
