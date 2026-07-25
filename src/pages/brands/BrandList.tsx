import { useState, useEffect, useMemo, type ChangeEvent, type JSX } from 'react';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Image as ImageIcon, X } from 'lucide-react';
import { useFormik, type FormikHelpers } from 'formik';
import { type ColumnDef, type Row, type SortingState, type ColumnFiltersState } from '@tanstack/react-table';
import DataGrid from '../../components/ui/DataGrid';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import StatusBadge from '../../components/ui/StatusBadge';
import AuthField from '../../components/ui/AuthField';
import { ApiError } from '../../lib/axios';
import {
  getBrandsPaginated,
  createBrand,
  updateBrand,
  deleteBrand,
  uploadBrandLogo,
  type GetBrandsPaginatedParams,
} from '../../services/brandService';
import type { Brand } from '../../types';
import { brandSchema, type BrandFormValues } from './brandSchemas';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_PAGE_SIZE, STATUS_FILTER_OPTIONS } from '../../lib/constants';

function toSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── LogoUploadField ──────────────────────────────────────────────────────────

interface LogoUploadFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

function LogoUploadField({ value, onChange }: LogoUploadFieldProps): JSX.Element {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await uploadBrandLogo(file);
      onChange(url);
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand Logo</label>
      {value ? (
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
            <img src={value} alt="Brand logo" className="w-full h-full object-contain p-1.5" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <label className={`inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 cursor-pointer hover:text-indigo-700 ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
            <input type="file" accept="image/jpeg,image/png,image/svg+xml" onChange={(e) => { void handleFileChange(e); }} className="hidden" />
            {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</> : 'Replace logo'}
          </label>
        </div>
      ) : (
        <label className={`flex flex-col items-center justify-center gap-1.5 w-full rounded-lg border-2 border-dashed border-gray-200 py-5 cursor-pointer hover:border-indigo-400 transition-colors ${uploading ? 'pointer-events-none opacity-70' : ''}`}>
          <input type="file" accept="image/jpeg,image/png,image/svg+xml" onChange={(e) => { void handleFileChange(e); }} className="hidden" />
          {uploading ? (
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
          ) : (
            <ImageIcon className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-xs text-gray-500">
            {uploading ? 'Uploading…' : 'SVG, JPG or PNG'}
          </span>
        </label>
      )}
    </div>
  );
}

// ── BrandModal ───────────────────────────────────────────────────────────────

interface BrandModalProps {
  brand: Brand | null;
  onClose: () => void;
  onSaved: (b: Brand) => void;
}

function BrandModal({ brand, onClose, onSaved }: BrandModalProps): JSX.Element {
  const isEdit = Boolean(brand);
  const toast  = useToast();

  const initialValues: BrandFormValues = {
    name: brand?.name ?? '',
    slug: brand?.slug ?? '',
    logo: brand?.logo ?? null,
  };

  async function handleSubmit(
    values: BrandFormValues,
    { setSubmitting, setStatus }: FormikHelpers<BrandFormValues>,
  ): Promise<void> {
    try {
      const saved = isEdit && brand
        ? await updateBrand(brand.id, values)
        : await createBrand({ name: values.name, slug: values.slug, logo: values.logo });
      toast.success(isEdit ? 'Brand updated' : 'Brand added');
      onSaved(saved);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setStatus('A brand with that name or slug already exists.');
      } else {
        setStatus('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const f = useFormik<BrandFormValues>({
    initialValues,
    validationSchema: brandSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>): void {
    f.handleChange(e);
    if (!isEdit || !brand) {
      void f.setFieldValue('slug', toSlug(e.target.value));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Brand' : 'Add Brand'}
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
              label="Name" name="name" placeholder="e.g. Nike" required
              value={f.values.name}
              onChange={handleNameChange}
              onBlur={f.handleBlur}
              touched={f.touched.name}
              error={f.errors.name}
            />

            <AuthField
              label="Slug" name="slug" placeholder="e.g. nike" required
              value={f.values.slug}
              onChange={f.handleChange}
              onBlur={f.handleBlur}
              touched={f.touched.slug}
              error={f.errors.slug}
            />

            <LogoUploadField
              value={f.values.logo}
              onChange={(logo): void => { void f.setFieldValue('logo', logo); }}
            />
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
              {f.isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── DeleteModal ────────────────────────────────────────────────────────────────

interface DeleteModalProps {
  brand: Brand;
  onClose: () => void;
  onDeleted: (id: number) => void;
}

function DeleteModal({ brand, onClose, onDeleted }: DeleteModalProps): JSX.Element {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const toast = useToast();

  async function handleDelete(): Promise<void> {
    setDeleting(true);
    try {
      await deleteBrand(brand.id);
      toast.success('Brand deleted');
      onDeleted(brand.id);
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
          <h3 className="text-base font-semibold text-gray-900">Delete brand?</h3>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{brand.name}</span> will be permanently removed.
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

// ── BrandList ────────────────────────────────────────────────────────────────

export default function BrandList(): JSX.Element {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [brands, setBrands]             = useState<Brand[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(DEFAULT_PAGE_SIZE);
  const [fetchKey, setFetchKey]         = useState(0);
  const [modalBrand, setModalBrand]     = useState<Brand | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
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
    const search      = debouncedFilters.find(f => f.id === 'name')?.value as string | undefined;
    const isActiveStr = debouncedFilters.find(f => f.id === 'isActive')?.value as string | undefined;

    const params: GetBrandsPaginatedParams = {
      page,
      limit: pageSize,
      ...(search      && { search }),
      ...(isActiveStr && { isActive: isActiveStr === 'true' }),
      ...(sortCol     && { sortBy: sortCol.id, sortOrder: sortCol.desc ? 'desc' as const : 'asc' as const }),
    };

    getBrandsPaginated(params)
      .then(r => { setBrands(r.brands); setTotal(r.total); })
      .catch((): void => { setError('Failed to load brands.'); })
      .finally((): void => { setLoading(false); });
  }, [page, pageSize, sorting, debouncedFilters, fetchKey]);

  function handleSaved(saved: Brand): void {
    const isAdd = !brands.find(b => b.id === saved.id);
    if (isAdd) {
      setPage(1);
      setFetchKey(k => k + 1);
    } else {
      setBrands(prev => prev.map(b => b.id === saved.id ? saved : b));
    }
    setModalBrand(undefined);
  }

  function handleDeleted(id: number): void {
    setBrands(prev => prev.filter(b => b.id !== id));
    setTotal(t => t - 1);
    setDeleteTarget(null);
  }

  async function handleToggleActive(brand: Brand): Promise<void> {
    setToggling(brand.id);
    try {
      const updated = await updateBrand(brand.id, { isActive: !brand.isActive });
      setBrands(prev => prev.map(b => b.id === updated.id ? updated : b));
      toast.success(updated.isActive ? 'Brand activated' : 'Brand deactivated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggling(null);
    }
  }

  const columns = useMemo<ColumnDef<Brand>[]>(() => [
    {
      id: 'logo',
      header: 'Logo',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { align: 'center', className: 'w-16' },
      cell: ({ row }: { row: Row<Brand> }) => (
        <div className="flex justify-center">
          <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
            {row.original.logo ? (
              <img src={row.original.logo} alt="" className="w-full h-full object-contain p-1" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-gray-300" />
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      enableSorting: true,
      enableColumnFilter: true,
      meta: { filterPlaceholder: 'Search name…' },
      cell: ({ row }: { row: Row<Brand> }) => (
        <span className="font-medium text-gray-900">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      enableSorting: true,
      enableColumnFilter: false,
      cell: ({ row }: { row: Row<Brand> }) => (
        <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
          {row.original.slug}
        </code>
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
      cell: ({ row }: { row: Row<Brand> }) => {
        const brand = row.original;
        return (
          <div className="flex justify-center">
            {hasPermission('brands', 'edit') ? (
              <ToggleSwitch
                active={brand.isActive}
                onToggle={toggling === brand.id ? (): void => {} : (): void => { void handleToggleActive(brand); }}
                title={`${brand.isActive ? 'Deactivate' : 'Activate'} ${brand.name}`}
              />
            ) : (
              <StatusBadge active={brand.isActive} />
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
      cell: ({ row }: { row: Row<Brand> }) => {
        const brand = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {hasPermission('brands', 'edit') && (
              <button
                onClick={() => setModalBrand(brand)}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {hasPermission('brands', 'delete') && (
              <button
                onClick={() => setDeleteTarget(brand)}
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
    return hasPermission('brands', 'edit') || hasPermission('brands', 'delete');
  }) as ColumnDef<Brand, unknown>[], [toggling, hasPermission]);

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
          <h1 className="text-xl font-bold text-gray-900">Brands</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
        {hasPermission('brands', 'add') && (
          <button
            onClick={() => setModalBrand(null)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Brand
          </button>
        )}
      </div>

      <DataGrid
        columns={columns}
        data={brands}
        loading={loading}
        skeletonRows={pageSize}
        emptyMessage="No brands found."
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: size => { setPageSize(size); setPage(1); } }}
      />

      {modalBrand !== undefined && (
        <BrandModal
          brand={modalBrand}
          onClose={() => setModalBrand(undefined)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          brand={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
