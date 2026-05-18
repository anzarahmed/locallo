import { useState, useEffect, type JSX } from 'react';
import { Plus, Pencil, Trash2, Loader2, GripVertical, AlertCircle } from 'lucide-react';
import { useFormik, type FormikHelpers } from 'formik';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import AuthField from '../../components/ui/AuthField';
import { ApiError } from '../../lib/axios';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../services/categoryService';
import type { Category } from '../../types';
import { categorySchema, type CategoryFormValues } from './categorySchemas';
import { useToast } from '../../hooks/useToast';

// ── helpers ────────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── CategoryModal ──────────────────────────────────────────────────────────────

interface CategoryModalProps {
  category: Category | null;
  onClose: () => void;
  onSaved: (c: Category) => void;
}

function CategoryModal({ category, onClose, onSaved }: CategoryModalProps): JSX.Element {
  const isEdit = Boolean(category);
  const toast = useToast();

  const initialValues: CategoryFormValues = {
    name:      category?.name      ?? '',
    slug:      category?.slug      ?? '',
    sortOrder: category?.sortOrder ?? 0,
  };

  async function handleSubmit(
    values: CategoryFormValues,
    { setSubmitting, setStatus }: FormikHelpers<CategoryFormValues>,
  ): Promise<void> {
    try {
      const saved = isEdit && category
        ? await updateCategory(category.id, values)
        : await createCategory(values);
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Category' : 'Add Category'}
          </h2>
        </div>

        <form onSubmit={f.handleSubmit} noValidate className="px-6 py-4 space-y-4">
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

          <div>
            <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1.5">
              Sort Order
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              value={f.values.sortOrder}
              onChange={f.handleChange}
              onBlur={f.handleBlur}
              className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow ${
                f.touched.sortOrder && f.errors.sortOrder
                  ? 'border-red-400 focus:ring-red-400 bg-red-50'
                  : 'border-gray-300 focus:ring-indigo-500'
              }`}
            />
            {f.touched.sortOrder && f.errors.sortOrder && (
              <p className="mt-1 text-xs text-red-600" role="alert">{f.errors.sortOrder}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
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
  const [error, setError] = useState<string | null>(null);
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
            <span className="font-medium text-gray-700">{category.name}</span> will be deactivated
            and hidden from all seller forms.
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

const PAGE_SIZE = 5;

export default function CategoryList(): JSX.Element {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalCategory, setModalCategory] = useState<Category | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  useEffect((): void => {
    setLoading(true);
    getCategories(true)
      .then(setCategories)
      .catch((): void => { setError('Failed to load categories.'); })
      .finally((): void => { setLoading(false); });
  }, []);

  function handleSaved(saved: Category): void {
    setCategories(prev => {
      const idx = prev.findIndex(c => c.id === saved.id);
      if (idx === -1) {
        const next = [...prev, saved].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
        setPage(Math.ceil(next.length / PAGE_SIZE));
        return next;
      }
      const next = [...prev];
      next[idx] = saved;
      return next;
    });
    setModalCategory(undefined);
  }

  function handleDeleted(id: number): void {
    setCategories(prev => {
      const next = prev.filter(c => c.id !== id);
      const maxPage = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
      setPage(p => Math.min(p, maxPage));
      return next;
    });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(categories.length / PAGE_SIZE));
  const paginated  = categories.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">{categories.length} total</p>
        </div>
        <button
          onClick={(): void => setModalCategory(null)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">
                <GripVertical className="w-4 h-4 text-gray-300" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Active</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  No categories yet. Add one to get started.
                </td>
              </tr>
            )}
            {paginated.map(cat => (
              <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-300">
                  <GripVertical className="w-4 h-4" />
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{cat.name}</span>
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{cat.slug}</code>
                </td>
                <td className="px-4 py-3 text-center text-gray-500">{cat.sortOrder}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-center">
                    <ToggleSwitch
                      active={cat.isActive}
                      onToggle={toggling === cat.id ? (): void => {} : (): void => { void handleToggleActive(cat); }}
                      title={`${cat.isActive ? 'Deactivate' : 'Activate'} ${cat.name}`}
                    />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(): void => setModalCategory(cat)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(): void => setDeleteTarget(cat)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination footer */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, categories.length)}–{Math.min(page * PAGE_SIZE, categories.length)} of {categories.length}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={(): void => setPage(p => p - 1)}
                className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={(): void => setPage(p => p + 1)}
                className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit modal — undefined = closed, null = adding, Category = editing */}
      {modalCategory !== undefined && (
        <CategoryModal
          category={modalCategory}
          onClose={(): void => setModalCategory(undefined)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          category={deleteTarget}
          onClose={(): void => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
