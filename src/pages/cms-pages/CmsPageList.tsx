import { useState, useEffect, useMemo, type ChangeEvent, type JSX } from 'react';
import { Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useFormik, type FormikHelpers } from 'formik';
import { type ColumnDef, type Row, type SortingState, type ColumnFiltersState } from '@tanstack/react-table';
import DataGrid from '../../components/ui/DataGrid';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import StatusBadge from '../../components/ui/StatusBadge';
import AuthField from '../../components/ui/AuthField';
import RichTextEditor from '../../components/ui/RichTextEditor';
import { ApiError } from '../../lib/axios';
import {
  getCmsPagesPaginated,
  createCmsPage,
  updateCmsPage,
  deleteCmsPage,
  type GetCmsPagesPaginatedParams,
} from '../../services/cmsPageService';
import type { CmsPage } from '../../types';
import { cmsPageSchema, type CmsPageFormValues } from './cmsPageSchemas';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_PAGE_SIZE, STATUS_FILTER_OPTIONS } from '../../lib/constants';

function toSlug(title: string): string {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toPlainText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── CmsPageModal ─────────────────────────────────────────────────────────────

interface CmsPageModalProps {
  page: CmsPage | null;
  onClose: () => void;
  onSaved: (p: CmsPage) => void;
}

function CmsPageModal({ page, onClose, onSaved }: CmsPageModalProps): JSX.Element {
  const isEdit = Boolean(page);
  const toast  = useToast();

  const initialValues: CmsPageFormValues = {
    title:   page?.title   ?? '',
    slug:    page?.slug    ?? '',
    content: page?.content ?? '',
  };

  async function handleSubmit(
    values: CmsPageFormValues,
    { setSubmitting, setStatus }: FormikHelpers<CmsPageFormValues>,
  ): Promise<void> {
    try {
      const saved = isEdit && page
        ? await updateCmsPage(page.id, values)
        : await createCmsPage(values);
      toast.success(isEdit ? 'Page updated' : 'Page added');
      onSaved(saved);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        setStatus('A page with that slug already exists.');
      } else {
        setStatus('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const f = useFormik<CmsPageFormValues>({
    initialValues,
    validationSchema: cmsPageSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: handleSubmit,
  });

  function handleTitleChange(e: ChangeEvent<HTMLInputElement>): void {
    f.handleChange(e);
    if (!isEdit) {
      void f.setFieldValue('slug', toSlug(e.target.value));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Page' : 'Add Page'}
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
              label="Title" name="title" placeholder="e.g. Privacy Policy" required
              value={f.values.title}
              onChange={handleTitleChange}
              onBlur={f.handleBlur}
              touched={f.touched.title}
              error={f.errors.title}
            />

            <AuthField
              label="Slug" name="slug" placeholder="e.g. privacy-policy" required
              value={f.values.slug}
              onChange={f.handleChange}
              onBlur={f.handleBlur}
              touched={f.touched.slug}
              error={f.errors.slug}
            />

            <RichTextEditor
              label="Content" name="content" required
              value={f.values.content}
              onChange={(html): void => void f.setFieldValue('content', html)}
              onBlur={() => f.setFieldTouched('content', true)}
              touched={f.touched.content}
              error={f.errors.content}
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
              {f.isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── DeleteModal ────────────────────────────────────────────────────────────────

interface DeleteModalProps {
  page: CmsPage;
  onClose: () => void;
  onDeleted: (id: number) => void;
}

function DeleteModal({ page, onClose, onDeleted }: DeleteModalProps): JSX.Element {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const toast = useToast();

  async function handleDelete(): Promise<void> {
    setDeleting(true);
    try {
      await deleteCmsPage(page.id);
      toast.success('Page deleted');
      onDeleted(page.id);
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
          <h3 className="text-base font-semibold text-gray-900">Delete Page?</h3>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            <span className="font-medium text-gray-700">{page.title}</span> will be permanently removed.
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

// ── CmsPageList ──────────────────────────────────────────────────────────────

export default function CmsPageList(): JSX.Element {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [pages, setPages]               = useState<CmsPage[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(DEFAULT_PAGE_SIZE);
  const [fetchKey, setFetchKey]         = useState(0);
  const [modalPage, setModalPage]       = useState<CmsPage | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<CmsPage | null>(null);
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
    const search      = debouncedFilters.find(f => f.id === 'title')?.value as string | undefined;
    const isActiveStr = debouncedFilters.find(f => f.id === 'isActive')?.value as string | undefined;

    const params: GetCmsPagesPaginatedParams = {
      page,
      limit: pageSize,
      ...(search      && { search }),
      ...(isActiveStr && { isActive: isActiveStr === 'true' }),
      ...(sortCol     && { sortBy: sortCol.id, sortOrder: sortCol.desc ? 'desc' as const : 'asc' as const }),
    };

    getCmsPagesPaginated(params)
      .then(r => { setPages(r.cmsPages); setTotal(r.total); })
      .catch((): void => { setError('Failed to load pages.'); })
      .finally((): void => { setLoading(false); });
  }, [page, pageSize, sorting, debouncedFilters, fetchKey]);

  function handleSaved(saved: CmsPage): void {
    const isAdd = !pages.find(p => p.id === saved.id);
    if (isAdd) {
      setPage(1);
      setFetchKey(k => k + 1);
    } else {
      setPages(prev => prev.map(p => p.id === saved.id ? saved : p));
    }
    setModalPage(undefined);
  }

  function handleDeleted(id: number): void {
    setPages(prev => prev.filter(p => p.id !== id));
    setTotal(t => t - 1);
    setDeleteTarget(null);
  }

  async function handleToggleActive(cmsPage: CmsPage): Promise<void> {
    setToggling(cmsPage.id);
    try {
      const updated = await updateCmsPage(cmsPage.id, { isActive: !cmsPage.isActive });
      setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
      toast.success(updated.isActive ? 'Page activated' : 'Page deactivated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggling(null);
    }
  }

  const columns = useMemo<ColumnDef<CmsPage>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Title',
      enableSorting: true,
      enableColumnFilter: true,
      meta: { filterPlaceholder: 'Search title…' },
      cell: ({ row }: { row: Row<CmsPage> }) => (
        <span className="font-medium text-gray-900 line-clamp-2">{row.original.title}</span>
      ),
    },
    {
      accessorKey: 'slug',
      header: 'Slug',
      enableSorting: true,
      enableColumnFilter: false,
      cell: ({ row }: { row: Row<CmsPage> }) => (
        <span className="text-gray-500 font-mono text-xs">{row.original.slug}</span>
      ),
    },
    {
      accessorKey: 'content',
      header: 'Content',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }: { row: Row<CmsPage> }) => (
        <span className="text-gray-500 line-clamp-2">{toPlainText(row.original.content)}</span>
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
      cell: ({ row }: { row: Row<CmsPage> }) => {
        const cmsPage = row.original;
        return (
          <div className="flex justify-center">
            {hasPermission('cmsPages', 'edit') ? (
              <ToggleSwitch
                active={cmsPage.isActive}
                onToggle={toggling === cmsPage.id ? (): void => {} : (): void => { void handleToggleActive(cmsPage); }}
                title={`${cmsPage.isActive ? 'Deactivate' : 'Activate'} page`}
              />
            ) : (
              <StatusBadge active={cmsPage.isActive} />
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
      cell: ({ row }: { row: Row<CmsPage> }) => {
        const cmsPage = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {hasPermission('cmsPages', 'edit') && (
              <button
                onClick={() => setModalPage(cmsPage)}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {hasPermission('cmsPages', 'delete') && (
              <button
                onClick={() => setDeleteTarget(cmsPage)}
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
    return hasPermission('cmsPages', 'edit') || hasPermission('cmsPages', 'delete');
  }) as ColumnDef<CmsPage, unknown>[], [toggling, hasPermission]);

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
          <h1 className="text-xl font-bold text-gray-900">CMS Pages</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
        {hasPermission('cmsPages', 'add') && (
          <button
            onClick={() => setModalPage(null)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Page
          </button>
        )}
      </div>

      <DataGrid
        columns={columns}
        data={pages}
        loading={loading}
        skeletonRows={pageSize}
        emptyMessage="No pages found."
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: size => { setPageSize(size); setPage(1); } }}
      />

      {modalPage !== undefined && (
        <CmsPageModal
          page={modalPage}
          onClose={() => setModalPage(undefined)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          page={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
