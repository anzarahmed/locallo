import { useState, useEffect, useMemo, type ChangeEvent, type JSX } from 'react';
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Image as ImageIcon, X } from 'lucide-react';
import { useFormik, type FormikHelpers } from 'formik';
import { type ColumnDef, type Row, type SortingState, type ColumnFiltersState } from '@tanstack/react-table';
import DataGrid from '../../components/ui/DataGrid';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import StatusBadge from '../../components/ui/StatusBadge';
import AuthField from '../../components/ui/AuthField';
import AttributeSchemaEditor from '../../components/ui/AttributeSchemaEditor';
import { ApiError } from '../../lib/axios';
import {
  getCategoriesPaginated,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryIcon,
  type GetCategoriesPaginatedParams,
} from '../../services/categoryService';
import type { AttributeField, Category } from '../../types';
import { categorySchema, type CategoryFormValues } from './categorySchemas';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_PAGE_SIZE, STATUS_FILTER_OPTIONS } from '../../lib/constants';

function toSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── IconUploadField ───────────────────────────────────────────────────────────

interface IconUploadFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

function IconUploadField({ value, onChange }: IconUploadFieldProps): JSX.Element {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await uploadCategoryIcon(file);
      onChange(url);
    } catch (err: unknown) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to upload icon');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">Category Icon</label>
      {value ? (
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
            <img src={value} alt="Category icon" className="w-full h-full object-contain p-1.5" />
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
            {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</> : 'Replace icon'}
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

// ── CategoryModal ──────────────────────────────────────────────────────────────

interface CategoryModalProps {
  category: Category | null;
  onClose: () => void;
  onSaved: (c: Category) => void;
}

function CategoryModal({ category, onClose, onSaved }: CategoryModalProps): JSX.Element {
  const isEdit = Boolean(category);
  const toast  = useToast();

  const initialValues: CategoryFormValues = {
    name:            category?.name            ?? '',
    slug:            category?.slug            ?? '',
    attributeSchema: category?.attributeSchema ?? [],
    icon:            category?.icon            ?? null,
  };

  async function handleSubmit(
    values: CategoryFormValues,
    { setSubmitting, setStatus }: FormikHelpers<CategoryFormValues>,
  ): Promise<void> {
    try {
      const saved = isEdit && category
        ? await updateCategory(category.id, values)
        : await createCategory({ name: values.name, slug: values.slug, attributeSchema: values.attributeSchema, icon: values.icon });
      toast.success(isEdit ? 'Category updated' : 'Category added');
      onSaved(saved);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setStatus('A category with that name or slug already exists.');
      } else {
        setStatus('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const f = useFormik<CategoryFormValues>({
    initialValues,
    validationSchema: categorySchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>): void {
    f.handleChange(e);
    if (!isEdit || !category) {
      void f.setFieldValue('slug', toSlug(e.target.value));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Category' : 'Add Category'}
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
              label="Name" name="name" placeholder="e.g. Grocery" required
              value={f.values.name}
              onChange={handleNameChange}
              onBlur={f.handleBlur}
              touched={f.touched.name}
              error={f.errors.name}
            />

            <AuthField
              label="Slug" name="slug" placeholder="e.g. grocery" required
              value={f.values.slug}
              onChange={f.handleChange}
              onBlur={f.handleBlur}
              touched={f.touched.slug}
              error={f.errors.slug}
            />

            <IconUploadField
              value={f.values.icon}
              onChange={(icon): void => { void f.setFieldValue('icon', icon); }}
            />

            <AttributeSchemaEditor
              value={f.values.attributeSchema}
              onChange={(fields: AttributeField[]): void => { void f.setFieldValue('attributeSchema', fields); }}
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
              {f.isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── DeleteModal ────────────────────────────────────────────────────────────────

interface DeleteModalProps {
  category: Category;
  onClose: () => void;
  onDeleted: (id: number) => void;
}

function DeleteModal({ category, onClose, onDeleted }: DeleteModalProps): JSX.Element {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const toast = useToast();

  async function handleDelete(): Promise<void> {
    setDeleting(true);
    try {
      await deleteCategory(category.id);
      toast.success('Category deleted');
      onDeleted(category.id);
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
          <h3 className="text-base font-semibold text-gray-900">Delete category?</h3>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{category.name}</span> will be permanently removed.
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

// ── CategoryList ───────────────────────────────────────────────────────────────

export default function CategoryList(): JSX.Element {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [categories, setCategories]       = useState<Category[]>([]);
  const [total, setTotal]                 = useState(0);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [page, setPage]                   = useState(1);
  const [pageSize, setPageSize]           = useState(DEFAULT_PAGE_SIZE);
  const [fetchKey, setFetchKey]           = useState(0);
  const [modalCategory, setModalCategory] = useState<Category | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget]   = useState<Category | null>(null);
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

    const params: GetCategoriesPaginatedParams = {
      page,
      limit: pageSize,
      ...(search      && { search }),
      ...(isActiveStr && { isActive: isActiveStr === 'true' }),
      ...(sortCol     && { sortBy: sortCol.id, sortOrder: sortCol.desc ? 'desc' as const : 'asc' as const }),
    };

    getCategoriesPaginated(params)
      .then(r => { setCategories(r.categories); setTotal(r.total); })
      .catch((): void => { setError('Failed to load categories.'); })
      .finally((): void => { setLoading(false); });
  }, [page, pageSize, sorting, debouncedFilters, fetchKey]);

  function handleSaved(saved: Category): void {
    const isAdd = !categories.find(c => c.id === saved.id);
    if (isAdd) {
      setPage(1);
      setFetchKey(k => k + 1);
    } else {
      setCategories(prev => prev.map(c => c.id === saved.id ? saved : c));
    }
    setModalCategory(undefined);
  }

  function handleDeleted(id: number): void {
    setCategories(prev => prev.filter(c => c.id !== id));
    setTotal(t => t - 1);
    setDeleteTarget(null);
  }

  async function handleToggleActive(cat: Category): Promise<void> {
    setToggling(cat.id);
    try {
      const updated = await updateCategory(cat.id, { isActive: !cat.isActive });
      setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
      toast.success(updated.isActive ? 'Category activated' : 'Category deactivated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggling(null);
    }
  }

  const columns = useMemo<ColumnDef<Category>[]>(() => [
    {
      id: 'icon',
      header: 'Icon',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { align: 'center', className: 'w-16' },
      cell: ({ row }: { row: Row<Category> }) => (
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
      cell: ({ row }: { row: Row<Category> }) => (
        <span className="font-medium text-gray-900">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      enableSorting: true,
      enableColumnFilter: false,
      cell: ({ row }: { row: Row<Category> }) => (
        <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
          {row.original.slug}
        </code>
      ),
    },
    {
      id: 'fields',
      accessorFn: (row: Category) => row.attributeSchema?.length ?? 0,
      header: 'Fields',
      enableSorting: false,
      enableColumnFilter: false,
      meta: { align: 'center' },
      cell: ({ row }: { row: Row<Category> }) => (
        <span className="text-xs text-gray-500">{row.original.attributeSchema?.length ?? 0}</span>
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
      cell: ({ row }: { row: Row<Category> }) => {
        const cat = row.original;
        return (
          <div className="flex justify-center">
            {hasPermission('categories', 'edit') ? (
              <ToggleSwitch
                active={cat.isActive}
                onToggle={toggling === cat.id ? (): void => {} : (): void => { void handleToggleActive(cat); }}
                title={`${cat.isActive ? 'Deactivate' : 'Activate'} ${cat.name}`}
              />
            ) : (
              <StatusBadge active={cat.isActive} />
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
      cell: ({ row }: { row: Row<Category> }) => {
        const cat = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {hasPermission('categories', 'edit') && (
              <button
                onClick={() => setModalCategory(cat)}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {hasPermission('categories', 'delete') && (
              <button
                onClick={() => setDeleteTarget(cat)}
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
    return hasPermission('categories', 'edit') || hasPermission('categories', 'delete');
  }) as ColumnDef<Category, unknown>[], [toggling, hasPermission]);

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
          <h1 className="text-xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
        {hasPermission('categories', 'add') && (
          <button
            onClick={() => setModalCategory(null)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        )}
      </div>

      <DataGrid
        columns={columns}
        data={categories}
        loading={loading}
        skeletonRows={pageSize}
        emptyMessage="No categories found."
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: size => { setPageSize(size); setPage(1); } }}
      />

      {modalCategory !== undefined && (
        <CategoryModal
          category={modalCategory}
          onClose={() => setModalCategory(undefined)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          category={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
