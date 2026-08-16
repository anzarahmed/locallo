import { useState, useEffect, useMemo, type JSX } from 'react';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Tag } from 'lucide-react';
import { useFormik, type FormikHelpers } from 'formik';
import { type ColumnDef, type Row, type SortingState, type ColumnFiltersState } from '@tanstack/react-table';
import DataGrid from '../../components/ui/DataGrid';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import StatusBadge from '../../components/ui/StatusBadge';
import AuthField from '../../components/ui/AuthField';
import SelectField from '../../components/ui/SelectField';
import { ApiError } from '../../lib/axios';
import {
  getOffersPaginated,
  createOffer,
  updateOffer,
  toggleOffer,
  deleteOffer,
  type GetOffersPaginatedParams,
} from '../../services/offerService';
import type { Offer, OfferConfig, OfferType } from '../../types';
import { offerSchema, OFFER_TYPE_OPTIONS, type OfferFormValues } from './offerSchemas';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_PAGE_SIZE, STATUS_FILTER_OPTIONS } from '../../lib/constants';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function tomorrowStartDatetimeLocalValue(): string {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return toDatetimeLocalValue(d.toISOString());
}

function hasOfferStarted(offer: Offer): boolean {
  return new Date(offer.startDate).getTime() <= Date.now();
}

function offerTypeLabel(type: OfferType): string {
  return OFFER_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type;
}

function offerSummary(offer: Offer): string {
  const c = offer.config as unknown as Record<string, number | undefined>;
  switch (offer.offerType) {
    case 'percentage_off':
      return `${c.discountPercent}% off${c.maxDiscountCap ? ` (up to ₹${c.maxDiscountCap})` : ''}`;
    case 'flat_amount_off':
      return `₹${c.flatAmount} off`;
    case 'bogo':
      return `Buy ${c.buyQty} Get ${c.getQty} at ${c.getDiscountPercent}% off`;
    default:
      return '';
  }
}

function configFromValues(values: OfferFormValues): OfferConfig {
  switch (values.offerType as OfferType) {
    case 'percentage_off':
      return {
        discountPercent: Number(values.discountPercent),
        ...(values.maxDiscountCap !== undefined && values.maxDiscountCap !== null && { maxDiscountCap: Number(values.maxDiscountCap) }),
      };
    case 'flat_amount_off':
      return { flatAmount: Number(values.flatAmount) };
    case 'bogo':
      return {
        buyQty: Number(values.buyQty),
        getQty: Number(values.getQty),
        getDiscountPercent: Number(values.getDiscountPercent),
      };
  }
}

// ── OfferModal ───────────────────────────────────────────────────────────────

interface OfferModalProps {
  offer: Offer | null;
  onClose: () => void;
  onSaved: (o: Offer) => void;
}

function OfferModal({ offer, onClose, onSaved }: OfferModalProps): JSX.Element {
  const isEdit = Boolean(offer);
  const toast  = useToast();
  const config = (offer?.config ?? {}) as unknown as Record<string, number | undefined>;
  const minStart = useMemo(() => tomorrowStartDatetimeLocalValue(), []);

  const initialValues: OfferFormValues = {
    title: offer?.title ?? '',
    description: offer?.description ?? '',
    startDate: offer ? toDatetimeLocalValue(offer.startDate) : '',
    endDate: offer ? toDatetimeLocalValue(offer.endDate) : '',
    offerType: offer?.offerType ?? 'percentage_off',
    discountPercent: config.discountPercent,
    maxDiscountCap: config.maxDiscountCap,
    flatAmount: config.flatAmount,
    buyQty: config.buyQty,
    getQty: config.getQty,
    getDiscountPercent: config.getDiscountPercent,
  };

  async function handleSubmit(
    values: OfferFormValues,
    { setSubmitting, setStatus }: FormikHelpers<OfferFormValues>,
  ): Promise<void> {
    try {
      const payload = {
        title: values.title,
        description: values.description || null,
        startDate: new Date(values.startDate).toISOString(),
        endDate: new Date(values.endDate).toISOString(),
        offerType: values.offerType as OfferType,
        config: configFromValues(values),
      };
      const saved = isEdit && offer
        ? await updateOffer(offer.id, payload)
        : await createOffer(payload);
      toast.success(isEdit ? 'Offer updated' : 'Offer created — sellers have been notified');
      onSaved(saved);
    } catch (err: unknown) {
      setStatus(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const f = useFormik<OfferFormValues>({
    initialValues,
    validationSchema: offerSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Offer' : 'Add Offer'}
          </h2>
        </div>

        <form onSubmit={f.handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {typeof f.status === 'string' && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
                {f.status}
              </div>
            )}

            <AuthField
              label="Offer Title" name="title" placeholder="e.g. Festive Season Sale" required
              value={f.values.title}
              onChange={f.handleChange}
              onBlur={f.handleBlur}
              touched={f.touched.title}
              error={f.errors.title}
            />

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                Offer Description
              </label>
              <textarea
                id="description" name="description" rows={3}
                placeholder="Describe the offer for sellers…"
                value={f.values.description ?? ''}
                onChange={f.handleChange} onBlur={f.handleBlur}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <AuthField
                label="Start Date & Time" name="startDate" type="datetime-local" required
                min={minStart}
                value={f.values.startDate}
                onChange={f.handleChange}
                onBlur={f.handleBlur}
                touched={f.touched.startDate}
                error={f.errors.startDate}
              />
              <AuthField
                label="End Date & Time" name="endDate" type="datetime-local" required
                min={f.values.startDate || minStart}
                value={f.values.endDate}
                onChange={f.handleChange}
                onBlur={f.handleBlur}
                touched={f.touched.endDate}
                error={f.errors.endDate}
              />
            </div>

            <SelectField
              label="Offer Type" name="offerType" required
              value={f.values.offerType}
              onChange={(e): void => {
                const nextType = e.target.value as OfferType;
                void f.setFieldValue('offerType', nextType);
                void f.setFieldValue('discountPercent', undefined);
                void f.setFieldValue('maxDiscountCap', undefined);
                void f.setFieldValue('flatAmount', undefined);
                void f.setFieldValue('buyQty', undefined);
                void f.setFieldValue('getQty', undefined);
                void f.setFieldValue('getDiscountPercent', undefined);
              }}
              onBlur={f.handleBlur}
              touched={f.touched.offerType}
              error={f.errors.offerType}
            >
              {OFFER_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </SelectField>

            {f.values.offerType === 'percentage_off' && (
              <div className="grid grid-cols-2 gap-4">
                <AuthField
                  label="Discount %" name="discountPercent" type="number" required
                  value={f.values.discountPercent ?? ''}
                  onChange={f.handleChange}
                  onBlur={f.handleBlur}
                  touched={f.touched.discountPercent}
                  error={f.errors.discountPercent}
                />
                <AuthField
                  label="Max Discount Cap (optional)" name="maxDiscountCap" type="number" placeholder="e.g. 200"
                  value={f.values.maxDiscountCap ?? ''}
                  onChange={f.handleChange}
                  onBlur={f.handleBlur}
                  touched={f.touched.maxDiscountCap}
                  error={f.errors.maxDiscountCap}
                />
              </div>
            )}

            {f.values.offerType === 'flat_amount_off' && (
              <AuthField
                label="Flat Amount Off (₹)" name="flatAmount" type="number" required
                value={f.values.flatAmount ?? ''}
                onChange={f.handleChange}
                onBlur={f.handleBlur}
                touched={f.touched.flatAmount}
                error={f.errors.flatAmount}
              />
            )}

            {f.values.offerType === 'bogo' && (
              <div className="grid grid-cols-3 gap-4">
                <AuthField
                  label="Buy Qty" name="buyQty" type="number" required
                  value={f.values.buyQty ?? ''}
                  onChange={f.handleChange}
                  onBlur={f.handleBlur}
                  touched={f.touched.buyQty}
                  error={f.errors.buyQty}
                />
                <AuthField
                  label="Get Qty" name="getQty" type="number" required
                  value={f.values.getQty ?? ''}
                  onChange={f.handleChange}
                  onBlur={f.handleBlur}
                  touched={f.touched.getQty}
                  error={f.errors.getQty}
                />
                <AuthField
                  label="Get Discount %" name="getDiscountPercent" type="number" required placeholder="100 = free"
                  value={f.values.getDiscountPercent ?? ''}
                  onChange={f.handleChange}
                  onBlur={f.handleBlur}
                  touched={f.touched.getDiscountPercent}
                  error={f.errors.getDiscountPercent}
                />
              </div>
            )}
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
              {f.isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── DeleteModal ──────────────────────────────────────────────────────────────

interface DeleteModalProps {
  offer: Offer;
  onClose: () => void;
  onDeleted: (id: number) => void;
}

function DeleteModal({ offer, onClose, onDeleted }: DeleteModalProps): JSX.Element {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const toast = useToast();

  async function handleDelete(): Promise<void> {
    setDeleting(true);
    try {
      await deleteOffer(offer.id);
      toast.success('Offer deleted');
      onDeleted(offer.id);
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
          <h3 className="text-base font-semibold text-gray-900">Delete offer?</h3>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{offer.title}</span> will be permanently removed, along with any seller product selections for it.
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

// ── OfferList ────────────────────────────────────────────────────────────────

export default function OfferList(): JSX.Element {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [offers, setOffers]             = useState<Offer[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(DEFAULT_PAGE_SIZE);
  const [fetchKey, setFetchKey]         = useState(0);
  const [modalOffer, setModalOffer]     = useState<Offer | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);
  const [toggling, setToggling]         = useState<number | null>(null);

  const [sorting, setSorting]                   = useState<SortingState>([{ id: 'startDate', desc: true }]);
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

    const sortCol      = sorting[0];
    const offerTypeStr = debouncedFilters.find(f => f.id === 'offerType')?.value as string | undefined;
    const isActiveStr  = debouncedFilters.find(f => f.id === 'isActive')?.value as string | undefined;
    const searchStr    = debouncedFilters.find(f => f.id === 'title')?.value as string | undefined;

    const params: GetOffersPaginatedParams = {
      page,
      limit: pageSize,
      ...(offerTypeStr && { offerType: offerTypeStr as OfferType }),
      ...(isActiveStr && { isActive: isActiveStr === 'true' }),
      ...(searchStr && { search: searchStr }),
      ...(sortCol && { sortBy: sortCol.id, sortOrder: sortCol.desc ? 'desc' as const : 'asc' as const }),
    };

    getOffersPaginated(params)
      .then(r => { setOffers(r.offers); setTotal(r.total); })
      .catch((): void => { setError('Failed to load offers.'); })
      .finally((): void => { setLoading(false); });
  }, [page, pageSize, sorting, debouncedFilters, fetchKey]);

  function handleSaved(saved: Offer): void {
    const isAdd = !offers.find(o => o.id === saved.id);
    if (isAdd) {
      setPage(1);
      setFetchKey(k => k + 1);
    } else {
      setOffers(prev => prev.map(o => o.id === saved.id ? saved : o));
    }
    setModalOffer(undefined);
  }

  function handleDeleted(id: number): void {
    setOffers(prev => prev.filter(o => o.id !== id));
    setTotal(t => t - 1);
    setDeleteTarget(null);
  }

  async function handleToggleActive(offer: Offer): Promise<void> {
    setToggling(offer.id);
    try {
      const updated = await toggleOffer(offer.id);
      setOffers(prev => prev.map(o => o.id === updated.id ? updated : o));
      toast.success(updated.isActive ? 'Offer activated' : 'Offer deactivated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggling(null);
    }
  }

  const columns = useMemo<ColumnDef<Offer>[]>(() => [
    {
      id: 'title',
      accessorFn: (row: Offer) => row.title,
      header: 'Offer',
      enableSorting: false,
      enableColumnFilter: true,
      meta: { filterVariant: 'text' },
      cell: ({ row }: { row: Row<Offer> }) => (
        <div>
          <span className="font-medium text-gray-900">{row.original.title}</span>
          <p className="text-xs text-gray-500 mt-0.5">{offerSummary(row.original)}</p>
        </div>
      ),
    },
    {
      id: 'offerType',
      accessorFn: (row: Offer) => row.offerType,
      header: 'Type',
      enableSorting: false,
      enableColumnFilter: true,
      meta: {
        filterVariant: 'select',
        filterOptions: OFFER_TYPE_OPTIONS.map(o => ({ label: o.label, value: o.value })),
      },
      cell: ({ row }: { row: Row<Offer> }) => (
        <span className="inline-flex items-center gap-1 text-gray-600 text-sm">
          <Tag className="w-3.5 h-3.5 text-gray-400" />
          {offerTypeLabel(row.original.offerType)}
        </span>
      ),
    },
    {
      id: 'startDate',
      header: 'Offer Period',
      enableSorting: true,
      accessorFn: (row: Offer) => row.startDate,
      enableColumnFilter: false,
      cell: ({ row }: { row: Row<Offer> }) => (
        <span className="text-gray-600 text-sm">
          {formatDateTime(row.original.startDate)} – {formatDateTime(row.original.endDate)}
        </span>
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
      cell: ({ row }: { row: Row<Offer> }) => {
        const offer = row.original;
        const started = hasOfferStarted(offer);
        return (
          <div className="flex justify-center">
            {hasPermission('offers', 'edit') ? (
              <ToggleSwitch
                active={offer.isActive}
                disabled={started || toggling === offer.id}
                onToggle={(): void => { void handleToggleActive(offer); }}
                title={started ? 'Offer has already started and cannot be changed' : `${offer.isActive ? 'Deactivate' : 'Activate'} offer`}
              />
            ) : (
              <StatusBadge active={offer.isActive} />
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
      cell: ({ row }: { row: Row<Offer> }) => {
        const offer = row.original;
        const started = hasOfferStarted(offer);
        return (
          <div className="flex items-center justify-end gap-1">
            {hasPermission('offers', 'edit') && (
              <button
                onClick={started ? undefined : () => setModalOffer(offer)}
                disabled={started}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
                title={started ? 'Offer has already started and cannot be edited' : 'Edit'}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {hasPermission('offers', 'delete') && (
              <button
                onClick={started ? undefined : () => setDeleteTarget(offer)}
                disabled={started}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
                title={started ? 'Offer has already started and cannot be deleted' : 'Delete'}
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
    return hasPermission('offers', 'edit') || hasPermission('offers', 'delete');
  }) as ColumnDef<Offer, unknown>[], [toggling, hasPermission]);

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
          <h1 className="text-xl font-bold text-gray-900">Offers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
        {hasPermission('offers', 'add') && (
          <button
            onClick={() => setModalOffer(null)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Offer
          </button>
        )}
      </div>

      <DataGrid
        columns={columns}
        data={offers}
        loading={loading}
        skeletonRows={pageSize}
        emptyMessage="No offers found."
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: size => { setPageSize(size); setPage(1); } }}
      />

      {modalOffer !== undefined && (
        <OfferModal
          offer={modalOffer}
          onClose={() => setModalOffer(undefined)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          offer={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
