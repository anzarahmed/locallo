import { useState, useEffect, useMemo, type ChangeEvent, type JSX } from 'react';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Info, Image as ImageIcon, X } from 'lucide-react';
import { useFormik, type FormikHelpers } from 'formik';
import { type ColumnDef, type Row, type SortingState, type ColumnFiltersState } from '@tanstack/react-table';
import DataGrid from '../../components/ui/DataGrid';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import StatusBadge from '../../components/ui/StatusBadge';
import AuthField from '../../components/ui/AuthField';
import ComboboxField from '../../components/ui/ComboboxField';
import { ApiError } from '../../lib/axios';
import {
  getBannersPaginated,
  createBanner,
  updateBanner,
  deleteBanner,
  uploadBannerImage,
  type GetBannersPaginatedParams,
} from '../../services/bannerService';
import { getBrandsPaginated } from '../../services/brandService';
import type { Banner, Brand } from '../../types';
import { bannerSchema, type BannerFormValues } from './bannerSchemas';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_PAGE_SIZE, STATUS_FILTER_OPTIONS } from '../../lib/constants';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── ImageUploadField ─────────────────────────────────────────────────────────

interface ImageUploadFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  touched?: boolean;
}

function ImageUploadField({ value, onChange, error, touched }: ImageUploadFieldProps): JSX.Element {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await uploadBannerImage(file);
      onChange(url);
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  const invalid = touched === true && Boolean(error);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Banner Image<span className="text-red-500 ml-0.5">*</span>
      </label>
      <div className="flex items-start gap-1.5 mb-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
        <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-700">
          Recommended size <span className="font-semibold">1200 × 400px</span> (3:1 ratio) for the best display on the mobile app. JPG, PNG or WebP, up to 5MB.
        </p>
      </div>
      {value ? (
        <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
          <img src={value} alt="Banner" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center gap-1.5 w-full aspect-[3/1] rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
          invalid ? 'border-red-300' : 'border-gray-200 hover:border-indigo-400'
        } ${uploading ? 'pointer-events-none opacity-70' : ''}`}>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { void handleFileChange(e); }} className="hidden" />
          {uploading ? (
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          ) : (
            <ImageIcon className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-xs text-gray-500">{uploading ? 'Uploading…' : 'JPG, PNG or WebP'}</span>
        </label>
      )}
      {invalid && <p className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}

// ── BannerModal ──────────────────────────────────────────────────────────────

interface BannerModalProps {
  banner: Banner | null;
  brands: Brand[];
  onClose: () => void;
  onSaved: (b: Banner) => void;
}

function BannerModal({ banner, brands, onClose, onSaved }: BannerModalProps): JSX.Element {
  const isEdit = Boolean(banner);
  const toast  = useToast();

  const initialValues: BannerFormValues = {
    brandId: banner?.brandId ?? 0,
    title: banner?.title ?? '',
    startDate: banner?.startDate?.slice(0, 10) ?? '',
    endDate: banner?.endDate?.slice(0, 10) ?? '',
    image: banner?.image ?? '',
  };

  async function handleSubmit(
    values: BannerFormValues,
    { setSubmitting, setStatus }: FormikHelpers<BannerFormValues>,
  ): Promise<void> {
    if (!values.image) {
      setStatus('Please upload a banner image.');
      setSubmitting(false);
      return;
    }
    try {
      const payload = {
        brandId: values.brandId,
        title: values.title || null,
        startDate: values.startDate,
        endDate: values.endDate,
        image: values.image,
      };
      const saved = isEdit && banner
        ? await updateBanner(banner.id, payload)
        : await createBanner(payload);
      toast.success(isEdit ? 'Banner updated' : 'Banner added');
      onSaved(saved);
    } catch (err: unknown) {
      setStatus(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const f = useFormik<BannerFormValues>({
    initialValues,
    validationSchema: bannerSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Banner' : 'Add Banner'}
          </h2>
        </div>

        <form onSubmit={f.handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {typeof f.status === 'string' && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
                {f.status}
              </div>
            )}

            <ImageUploadField
              value={f.values.image}
              onChange={(image): void => { void f.setFieldValue('image', image); }}
              touched={f.touched.image as boolean | undefined}
              error={f.errors.image as string | undefined}
            />

            <ComboboxField
              label="Brand"
              name="brandId"
              required
              value={f.values.brandId}
              options={brands.map(b => ({ label: b.name, value: b.id }))}
              onChange={(val): void => { void f.setFieldValue('brandId', Number(val)); }}
              onBlur={() => f.setFieldTouched('brandId')}
              touched={f.touched.brandId}
              error={f.errors.brandId}
              placeholder="Select a brand"
            />

            <AuthField
              label="Title" name="title" placeholder="e.g. Adidas Summer Sale (optional)"
              value={f.values.title ?? ''}
              onChange={f.handleChange}
              onBlur={f.handleBlur}
              touched={f.touched.title}
              error={f.errors.title}
            />

            <div className="grid grid-cols-2 gap-4">
              <AuthField
                label="Start Date" name="startDate" type="date" required
                value={f.values.startDate}
                onChange={f.handleChange}
                onBlur={f.handleBlur}
                touched={f.touched.startDate}
                error={f.errors.startDate}
              />
              <AuthField
                label="End Date" name="endDate" type="date" required
                value={f.values.endDate}
                onChange={f.handleChange}
                onBlur={f.handleBlur}
                touched={f.touched.endDate}
                error={f.errors.endDate}
              />
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
              {f.isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── DeleteModal ──────────────────────────────────────────────────────────────

interface DeleteModalProps {
  banner: Banner;
  onClose: () => void;
  onDeleted: (id: number) => void;
}

function DeleteModal({ banner, onClose, onDeleted }: DeleteModalProps): JSX.Element {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const toast = useToast();

  async function handleDelete(): Promise<void> {
    setDeleting(true);
    try {
      await deleteBanner(banner.id);
      toast.success('Banner deleted');
      onDeleted(banner.id);
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
          <h3 className="text-base font-semibold text-gray-900">Delete banner?</h3>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{banner.title || banner.brand?.name}</span> will be permanently removed.
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

// ── BannerList ───────────────────────────────────────────────────────────────

export default function BannerList(): JSX.Element {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [banners, setBanners]           = useState<Banner[]>([]);
  const [brands, setBrands]             = useState<Brand[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(DEFAULT_PAGE_SIZE);
  const [fetchKey, setFetchKey]         = useState(0);
  const [modalBanner, setModalBanner]   = useState<Banner | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [toggling, setToggling]         = useState<number | null>(null);

  const [sorting, setSorting]                   = useState<SortingState>([{ id: 'startDate', desc: false }]);
  const [columnFilters, setColumnFilters]       = useState<ColumnFiltersState>([]);
  const [debouncedFilters, setDebouncedFilters] = useState<ColumnFiltersState>([]);

  useEffect(() => {
    getBrandsPaginated({ limit: 1000 }).then(r => setBrands(r.brands)).catch(() => {});
  }, []);

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
    const brandIdStr   = debouncedFilters.find(f => f.id === 'brand')?.value as string | undefined;
    const isActiveStr = debouncedFilters.find(f => f.id === 'isActive')?.value as string | undefined;

    const params: GetBannersPaginatedParams = {
      page,
      limit: pageSize,
      ...(brandIdStr   && { brandId: Number(brandIdStr) }),
      ...(isActiveStr && { isActive: isActiveStr === 'true' }),
      ...(sortCol     && { sortBy: sortCol.id, sortOrder: sortCol.desc ? 'desc' as const : 'asc' as const }),
    };

    getBannersPaginated(params)
      .then(r => { setBanners(r.banners); setTotal(r.total); })
      .catch((): void => { setError('Failed to load banners.'); })
      .finally((): void => { setLoading(false); });
  }, [page, pageSize, sorting, debouncedFilters, fetchKey]);

  function handleSaved(saved: Banner): void {
    const isAdd = !banners.find(b => b.id === saved.id);
    if (isAdd) {
      setPage(1);
      setFetchKey(k => k + 1);
    } else {
      setBanners(prev => prev.map(b => b.id === saved.id ? saved : b));
    }
    setModalBanner(undefined);
  }

  function handleDeleted(id: number): void {
    setBanners(prev => prev.filter(b => b.id !== id));
    setTotal(t => t - 1);
    setDeleteTarget(null);
  }

  async function handleToggleActive(banner: Banner): Promise<void> {
    setToggling(banner.id);
    try {
      const updated = await updateBanner(banner.id, { isActive: !banner.isActive });
      setBanners(prev => prev.map(b => b.id === updated.id ? updated : b));
      toast.success(updated.isActive ? 'Banner activated' : 'Banner deactivated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggling(null);
    }
  }

  const columns = useMemo<ColumnDef<Banner>[]>(() => [
    {
      id: 'image',
      header: 'Image',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { align: 'center', className: 'w-20' },
      cell: ({ row }: { row: Row<Banner> }) => (
        <div className="flex justify-center">
          <div className="w-14 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
            {row.original.image ? (
              <img src={row.original.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-gray-300" />
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'title',
      accessorFn: (row: Banner) => row.title ?? '',
      header: 'Title',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }: { row: Row<Banner> }) => (
        <span className="font-medium text-gray-900">{row.original.title || '—'}</span>
      ),
    },
    {
      id: 'brand',
      accessorFn: (row: Banner) => row.brand?.name ?? '',
      header: 'Brand',
      enableSorting: false,
      enableColumnFilter: true,
      meta: {
        filterVariant: 'combobox',
        filterOptions: brands.map(b => ({ label: b.name, value: String(b.id) })),
      },
      cell: ({ row }: { row: Row<Banner> }) => (
        <span className="text-gray-600">{row.original.brand?.name ?? '—'}</span>
      ),
    },
    {
      id: 'startDate',
      header: 'Active Dates',
      enableSorting: true,
      accessorFn: (row: Banner) => row.startDate,
      enableColumnFilter: false,
      cell: ({ row }: { row: Row<Banner> }) => (
        <span className="text-gray-600 text-sm">
          {formatDate(row.original.startDate)} – {formatDate(row.original.endDate)}
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
      cell: ({ row }: { row: Row<Banner> }) => {
        const banner = row.original;
        return (
          <div className="flex justify-center">
            {hasPermission('banners', 'edit') ? (
              <ToggleSwitch
                active={banner.isActive}
                onToggle={toggling === banner.id ? (): void => {} : (): void => { void handleToggleActive(banner); }}
                title={`${banner.isActive ? 'Deactivate' : 'Activate'} banner`}
              />
            ) : (
              <StatusBadge active={banner.isActive} />
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
      cell: ({ row }: { row: Row<Banner> }) => {
        const banner = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {hasPermission('banners', 'edit') && (
              <button
                onClick={() => setModalBanner(banner)}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {hasPermission('banners', 'delete') && (
              <button
                onClick={() => setDeleteTarget(banner)}
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
    return hasPermission('banners', 'edit') || hasPermission('banners', 'delete');
  }) as ColumnDef<Banner, unknown>[], [toggling, hasPermission, brands]);

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
          <h1 className="text-xl font-bold text-gray-900">Banners</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
        {hasPermission('banners', 'add') && (
          <button
            onClick={() => setModalBanner(null)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Banner
          </button>
        )}
      </div>

      <DataGrid
        columns={columns}
        data={banners}
        loading={loading}
        skeletonRows={pageSize}
        emptyMessage="No banners found."
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: size => { setPageSize(size); setPage(1); } }}
      />

      {modalBanner !== undefined && (
        <BannerModal
          banner={modalBanner}
          brands={brands}
          onClose={() => setModalBanner(undefined)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          banner={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
