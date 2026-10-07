import { useState, useEffect, useMemo, type JSX } from 'react';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useFormik, type FormikHelpers } from 'formik';
import { type ColumnDef, type Row, type SortingState, type ColumnFiltersState } from '@tanstack/react-table';
import DataGrid from '../../components/ui/DataGrid';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import StatusBadge from '../../components/ui/StatusBadge';
import AuthField from '../../components/ui/AuthField';
import IconUploadField from '../../components/ui/IconUploadField';
import { ApiError } from '../../lib/axios';
import {
  getMasterCategoriesPaginated,
  createMasterCategory,
  updateMasterCategory,
  deleteMasterCategory,
  uploadMasterCategoryIcon,
  type GetMasterCategoriesPaginatedParams,
} from '../../services/masterCategoryService';
import type { MasterCategory } from '../../types';
import { masterCategorySchema, type MasterCategoryFormValues } from './masterCategorySchemas';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_PAGE_SIZE, STATUS_FILTER_OPTIONS } from '../../lib/constants';

function toSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── MasterCategoryModal ───────────────────────────────────────────────────────

interface MasterCategoryModalProps {
  masterCategory: MasterCategory | null;
  onClose: () => void;
  onSaved: (mc: MasterCategory) => void;
}

function MasterCategoryModal({ masterCategory, onClose, onSaved }: MasterCategoryModalProps): JSX.Element {
  const isEdit = Boolean(masterCategory);
  const toast  = useToast();

  const initialValues: MasterCategoryFormValues = {
    name: masterCategory?.name ?? '',
    slug: masterCategory?.slug ?? '',
    icon: masterCategory?.icon ?? null,
  };

  async function handleSubmit(
    values: MasterCategoryFormValues,
    { setSubmitting, setStatus }: FormikHelpers<MasterCategoryFormValues>,
  ): Promise<void> {
    try {
      const saved = isEdit && masterCategory
        ? await updateMasterCategory(masterCategory.id, values)
        : await createMasterCategory(values);
      toast.success(isEdit ? 'Master category updated' : 'Master category added');
      onSaved(saved);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setStatus('A master category with that name or slug already exists.');
      } else {
        setStatus('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const f = useFormik<MasterCategoryFormValues>({
    initialValues,
    validationSchema: masterCategorySchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>): void {
    f.handleChange(e);
    if (!isEdit || !masterCategory) {
      void f.setFieldValue('slug', toSlug(e.target.value));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Master Category' : 'Add Master Category'}
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
              label="Title" name="name" placeholder="e.g. Fashion" required
              value={f.values.name}
              onChange={handleNameChange}
              onBlur={f.handleBlur}
              touched={f.touched.name}
              error={f.errors.name}
            />

            <AuthField
              label="Slug" name="slug" placeholder="e.g. fashion" required
              value={f.values.slug}
              onChange={f.handleChange}
              onBlur={f.handleBlur}
              touched={f.touched.slug}
              error={f.errors.slug}
            />

            <IconUploadField
              label="Icon"
              value={f.values.icon}
              onChange={(icon): void => { void f.setFieldValue('icon', icon); }}
              upload={uploadMasterCategoryIcon}
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
              {f.isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Master Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── DeleteModal ────────────────────────────────────────────────────────────────

interface DeleteModalProps {
  masterCategory: MasterCategory;
  onClose: () => void;
  onDeleted: (id: number) => void;
}

function DeleteModal({ masterCategory, onClose, onDeleted }: DeleteModalProps): JSX.Element {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const toast = useToast();

  async function handleDelete(): Promise<void> {
    setDeleting(true);
    try {
      await deleteMasterCategory(masterCategory.id);
      toast.success('Master category deleted');
      onDeleted(masterCategory.id);
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
          <h3 className="text-base font-semibold text-gray-900">Delete master category?</h3>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{masterCategory.name}</span> will be permanently removed.
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

// ── MasterCategoryList ─────────────────────────────────────────────────────────

export default function MasterCategoryList(): JSX.Element {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [masterCategories, setMasterCategories] = useState<MasterCategory[]>([]);
  const [total, setTotal]                 = useState(0);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [page, setPage]                   = useState(1);
  const [pageSize, setPageSize]           = useState(DEFAULT_PAGE_SIZE);
  const [fetchKey, setFetchKey]           = useState(0);
  const [modalMasterCategory, setModalMasterCategory] = useState<MasterCategory | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget]   = useState<MasterCategory | null>(null);
  const [toggling, setToggling]           = useState<number | null>(null);

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

    const params: GetMasterCategoriesPaginatedParams = {
      page,
      limit: pageSize,
      ...(search      && { search }),
      ...(isActiveStr && { isActive: isActiveStr === 'true' }),
      ...(sortCol     && { sortBy: sortCol.id, sortOrder: sortCol.desc ? 'desc' as const : 'asc' as const }),
    };

    getMasterCategoriesPaginated(params)
      .then(r => { setMasterCategories(r.masterCategories); setTotal(r.total); })
      .catch((): void => { setError('Failed to load master categories.'); })
      .finally((): void => { setLoading(false); });
  }, [page, pageSize, sorting, debouncedFilters, fetchKey]);

  function handleSaved(saved: MasterCategory): void {
    const isAdd = !masterCategories.find(mc => mc.id === saved.id);
    if (isAdd) {
      setPage(1);
      setFetchKey(k => k + 1);
    } else {
      setMasterCategories(prev => prev.map(mc => mc.id === saved.id ? saved : mc));
    }
    setModalMasterCategory(undefined);
  }

  function handleDeleted(id: number): void {
    setMasterCategories(prev => prev.filter(mc => mc.id !== id));
    setTotal(t => t - 1);
    setDeleteTarget(null);
  }

  async function handleToggleActive(mc: MasterCategory): Promise<void> {
    setToggling(mc.id);
    try {
      const updated = await updateMasterCategory(mc.id, { isActive: !mc.isActive });
      setMasterCategories(prev => prev.map(m => m.id === updated.id ? updated : m));
      toast.success(updated.isActive ? 'Master category activated' : 'Master category deactivated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggling(null);
    }
  }

  const columns = useMemo<ColumnDef<MasterCategory>[]>(() => [
    {
      id: 'icon',
      header: 'Icon',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { align: 'center', className: 'w-16' },
      cell: ({ row }: { row: Row<MasterCategory> }) => (
        <div className="flex justify-center">
          <div className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
            {row.original.icon ? (
              <img src={row.original.icon} alt="" className="w-full h-full object-contain p-1" />
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
      cell: ({ row }: { row: Row<MasterCategory> }) => (
        <span className="font-medium text-gray-900">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      enableSorting: true,
      enableColumnFilter: false,
      cell: ({ row }: { row: Row<MasterCategory> }) => (
        <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
          {row.original.slug}
        </code>
      ),
    },
    {
      id: 'categoryCount',
      accessorFn: (row: MasterCategory) => row.categoryCount ?? 0,
      header: 'Categories',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { align: 'center' },
      cell: ({ row }: { row: Row<MasterCategory> }) => (
        <span className="text-xs text-gray-500">{row.original.categoryCount ?? 0}</span>
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
      cell: ({ row }: { row: Row<MasterCategory> }) => {
        const mc = row.original;
        return (
          <div className="flex justify-center">
            {hasPermission('masterCategories', 'edit') ? (
              <ToggleSwitch
                active={mc.isActive}
                onToggle={toggling === mc.id ? (): void => {} : (): void => { void handleToggleActive(mc); }}
                title={`${mc.isActive ? 'Deactivate' : 'Activate'} ${mc.name}`}
              />
            ) : (
              <StatusBadge active={mc.isActive} />
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
      cell: ({ row }: { row: Row<MasterCategory> }) => {
        const mc = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {hasPermission('masterCategories', 'edit') && (
              <button
                onClick={() => setModalMasterCategory(mc)}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {hasPermission('masterCategories', 'delete') && (
              <button
                onClick={() => setDeleteTarget(mc)}
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
    return hasPermission('masterCategories', 'edit') || hasPermission('masterCategories', 'delete');
  }) as ColumnDef<MasterCategory, unknown>[], [toggling, hasPermission]);

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
          <h1 className="text-xl font-bold text-gray-900">Master Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
        {hasPermission('masterCategories', 'add') && (
          <button
            onClick={() => setModalMasterCategory(null)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Master Category
          </button>
        )}
      </div>

      <DataGrid
        columns={columns}
        data={masterCategories}
        loading={loading}
        skeletonRows={pageSize}
        emptyMessage="No master categories found."
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: size => { setPageSize(size); setPage(1); } }}
      />

      {modalMasterCategory !== undefined && (
        <MasterCategoryModal
          masterCategory={modalMasterCategory}
          onClose={() => setModalMasterCategory(undefined)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          masterCategory={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
