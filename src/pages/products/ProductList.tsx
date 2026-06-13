import { useState, useEffect, useMemo, type JSX } from 'react';
import { Package, Trash2, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { type ColumnDef, type Row, type SortingState, type ColumnFiltersState } from '@tanstack/react-table';
import DataGrid from '../../components/ui/DataGrid';
import ToggleSwitch from '../../components/ui/ToggleSwitch';
import StatusBadge from '../../components/ui/StatusBadge';
import ProductDetail from './ProductDetail';
import { getProducts, toggleProduct, deleteProduct } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { getAllSellers, type Seller } from '../../services/sellerService';
import { ApiError } from '../../lib/axios';
import type { Category, Product } from '../../types';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { SkeletonThumbnailCell, SkeletonPriceCell } from '../../components/ui/SkeletonCells';
import { DEFAULT_PAGE_SIZE, STATUS_FILTER_OPTIONS } from '../../lib/constants';

function imgUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${import.meta.env.VITE_API_URL as string}${path}`;
}

function formatPrice(val: number | string | null): string {
  if (val === null || val === undefined) return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

function ThumbnailImage({ src, alt }: { src: string; alt: string }): JSX.Element {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 relative">
      {status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200" />
      )}
      {status === 'error' ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Package className="w-4 h-4 text-gray-300" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`w-full h-full object-cover transition-opacity duration-150 ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}

interface DeleteModalProps {
  product: Product;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

function DeleteModal({ product, onClose, onDeleted }: DeleteModalProps): JSX.Element {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const toast = useToast();

  async function handleDelete(): Promise<void> {
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      toast.success('Product deleted');
      onDeleted(product.id);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
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
          <h3 className="text-base font-semibold text-gray-900">Delete product?</h3>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-medium text-gray-700">{product.name}</span> will be permanently removed.
          </p>
        </div>
        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { void handleDelete(); }}
            disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductList(): JSX.Element {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [products, setProducts]     = useState<Product[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(DEFAULT_PAGE_SIZE);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellers, setSellers]       = useState<Seller[]>([]);
  const [toggling, setToggling]     = useState<string | null>(null);
  const [detailId, setDetailId]     = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const [sorting, setSorting]               = useState<SortingState>([]);
  const initialFilters: ColumnFiltersState  = [];
  const [columnFilters, setColumnFilters]   = useState<ColumnFiltersState>(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState<ColumnFiltersState>(initialFilters);

  useEffect((): void => {
    getCategories(false).then(setCategories).catch(() => {});
    getAllSellers().then(setSellers).catch(() => {});
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

    const sortCol    = sorting[0];
    const search      = debouncedFilters.find(f => f.id === 'name')?.value as string | undefined;
    const catId       = debouncedFilters.find(f => f.id === 'category')?.value as string | undefined;
    const sellerIdVal = debouncedFilters.find(f => f.id === 'seller')?.value as string | undefined;
    const isActiveStr = debouncedFilters.find(f => f.id === 'isActive')?.value as string | undefined;

    const params = {
      page,
      limit: pageSize,
      ...(search        && { search }),
      ...(catId         && { categoryId: Number(catId) }),
      ...(sellerIdVal   && { sellerId: sellerIdVal }),
      ...(isActiveStr   && { isActive: isActiveStr === 'true' }),
      ...(sortCol       && { sortBy: sortCol.id, sortOrder: sortCol.desc ? 'desc' as const : 'asc' as const }),
    };

    getProducts(params)
      .then(r => { setProducts(r.products); setTotal(r.total); })
      .catch(() => { setError('Failed to load products.'); })
      .finally(() => { setLoading(false); });
  }, [page, pageSize, sorting, debouncedFilters]);

  async function handleToggle(product: Product): Promise<void> {
    setToggling(product.id);
    try {
      const updated = await toggleProduct(product.id);
      setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, isActive: updated.isActive } : p));
      toast.success(updated.isActive ? 'Product activated' : 'Product deactivated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setToggling(null);
    }
  }

  function handleToggled(updated: Product): void {
    setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, isActive: updated.isActive } : p));
  }

  function handleDeleted(id: string): void {
    setProducts(prev => prev.filter(p => p.id !== id));
    setTotal(t => t - 1);
    setDeleteTarget(null);
  }

  const columns = useMemo<ColumnDef<Product>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Product',
      enableSorting: true,
      enableColumnFilter: true,
      meta: {
        filterPlaceholder: 'Search products…',
        skeletonCell: () => <SkeletonThumbnailCell />,
      },
      cell: ({ row }: { row: Row<Product> }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-3">
            {p.images.length > 0 ? (
              <ThumbnailImage src={imgUrl(p.images[0])} alt={p.name} />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                <Package className="w-4 h-4 text-gray-300" />
              </div>
            )}
            <span className="font-medium text-gray-900 max-w-48 truncate" title={p.name}>{p.name}</span>
          </div>
        );
      },
    },
    {
      id: 'category',
      accessorFn: (row: Product) => row.category?.name ?? '',
      header: 'Category',
      enableSorting: false,
      enableColumnFilter: true,
      meta: {
        filterVariant: 'combobox',
        filterOptions: categories.map(c => ({ label: c.name, value: String(c.id) })),
      },
      cell: ({ row }: { row: Row<Product> }) => (
        <span className="text-gray-600">{row.original.category?.name ?? '—'}</span>
      ),
    },
    {
      id: 'seller',
      accessorFn: (row: Product) => row.seller?.sellerProfile?.businessName ?? row.seller?.fullName ?? '',
      header: 'Seller',
      enableSorting: false,
      enableColumnFilter: true,
      meta: {
        filterVariant: 'combobox',
        filterOptions: sellers.map(s => ({
          label: s.businessName ?? s.fullName ?? s.mobile,
          value: s.id,
        })),
      },
      cell: ({ row }: { row: Row<Product> }) => (
        <span className="text-gray-600 max-w-36 truncate block">
          {row.original.seller?.sellerProfile?.businessName ?? row.original.seller?.fullName ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'sellingPrice',
      header: 'Price',
      enableSorting: true,
      enableColumnFilter: false,
      meta: {
        skeletonCell: () => <SkeletonPriceCell />,
        align: 'right',
      },
      cell: ({ row }: { row: Row<Product> }) => {
        const p = row.original;
        return (
          <>
            <span className="font-medium text-gray-900">{formatPrice(p.sellingPrice)}</span>
            {p.mrp && Number(p.mrp) > Number(p.sellingPrice) && (
              <span className="block text-xs text-gray-400 line-through">{formatPrice(p.mrp)}</span>
            )}
          </>
        );
      },
    },
    {
      accessorKey: 'stock',
      header: 'Stock',
      enableSorting: true,
      enableColumnFilter: false,
      meta: { align: 'center' },
      cell: ({ row }: { row: Row<Product> }) => (
        <span className={`text-sm font-medium ${row.original.stock === 0 ? 'text-red-500' : 'text-gray-700'}`}>
          {row.original.stock}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Active',
      enableSorting: false,
      enableColumnFilter: true,
      meta: {
        filterVariant: 'select',
        filterOptions: STATUS_FILTER_OPTIONS,
        align: 'center',
      },
      cell: ({ row }: { row: Row<Product> }) => {
        const p = row.original;
        return (
          <div className="flex justify-center">
            {hasPermission('products', 'edit') ? (
              <ToggleSwitch
                active={p.isActive}
                onToggle={toggling === p.id ? () => {} : () => { void handleToggle(p); }}
                title={`${p.isActive ? 'Deactivate' : 'Activate'} product`}
              />
            ) : (
              <StatusBadge active={p.isActive} />
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
      cell: ({ row }: { row: Row<Product> }) => {
        const p = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {hasPermission('products', 'view') && (
              <button
                onClick={() => setDetailId(p.id)}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="View"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {hasPermission('products', 'delete') && (
              <button
                onClick={() => setDeleteTarget(p)}
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
    return hasPermission('products', 'view') || hasPermission('products', 'delete');
  }) as ColumnDef<Product, unknown>[], [categories, sellers, toggling, hasPermission]);

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
          <h1 className="text-xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total</p>
        </div>
      </div>

      <DataGrid
        columns={columns}
        data={products}
        loading={loading}
        skeletonRows={pageSize}
        emptyMessage="No products found"
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        pagination={{ page, pageSize, total, onPageChange: setPage, onPageSizeChange: size => { setPageSize(size); setPage(1); } }}
      />

      {detailId !== null && (
        <ProductDetail
          productId={detailId}
          onClose={() => setDetailId(null)}
          onToggled={handleToggled}
          onDeleted={(id) => { handleDeleted(id); setDetailId(null); }}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
