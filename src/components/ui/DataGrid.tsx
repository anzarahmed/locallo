import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type OnChangeFn,
  type RowData,
  type VisibilityState,
} from '@tanstack/react-table';
import { useState, type JSX } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Eye, EyeOff, X } from 'lucide-react';
import { ColumnTextFilter, ColumnSelectFilter } from './DataGridFilters';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filterPlaceholder?: string;
    filterVariant?: 'text' | 'select';
    filterOptions?: Array<{ label: string; value: string }>;
    hideFromVisibility?: boolean;
  }
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

interface DataGridProps<TData extends object> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  loading?: boolean;
  skeletonRows?: number;
  emptyMessage?: string;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  manualSorting?: boolean;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  manualFiltering?: boolean;
  pagination?: PaginationInfo;
}

export default function DataGrid<TData extends object>({
  columns,
  data,
  loading = false,
  skeletonRows = 5,
  emptyMessage = 'No data found',
  sorting = [],
  onSortingChange,
  manualSorting = true,
  columnFilters = [],
  onColumnFiltersChange,
  manualFiltering = true,
  pagination,
}: DataGridProps<TData>): JSX.Element {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: manualFiltering ? undefined : getFilteredRowModel(),
    manualSorting,
    manualFiltering,
  });

  const hasFilterRow = table.getAllColumns().some(c => c.getCanFilter());

  const hiddenCols = table
    .getAllColumns()
    .filter(c => !c.getIsVisible() && !c.columnDef.meta?.hideFromVisibility);

  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize)) : 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

      {hasFilterRow && columnFilters.length > 0 && onColumnFiltersChange && (
        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {columnFilters.length} filter{columnFilters.length > 1 ? 's' : ''} applied
          </span>
          <button
            onClick={() => onColumnFiltersChange([])}
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
            Reset filters
          </button>
        </div>
      )}

      {hiddenCols.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 shrink-0">Hidden:</span>
          {hiddenCols.map(col => (
            <button
              key={col.id}
              onClick={() => col.toggleVisibility(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-500 bg-white border border-gray-300 rounded-full hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              <EyeOff className="w-3 h-3" />
              {typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <>
                <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50">
                  {headerGroup.headers.map(header => {
                    const canSort = header.column.getCanSort();
                    const sortDir = header.column.getIsSorted();
                    const canHide = !header.column.columnDef.meta?.hideFromVisibility;

                    return (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide select-none"
                      >
                        <div className="flex items-center gap-1 group">
                          {canSort ? (
                            <button
                              onClick={header.column.getToggleSortingHandler()}
                              className="inline-flex items-center gap-1 hover:text-gray-700 transition-colors"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {sortDir === 'asc' ? (
                                <ChevronUp className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              ) : sortDir === 'desc' ? (
                                <ChevronDown className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              ) : (
                                <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                              )}
                            </button>
                          ) : (
                            <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          )}
                          {canHide && (
                            <button
                              onClick={() => header.column.toggleVisibility(false)}
                              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-gray-300 hover:text-gray-500"
                              title={`Hide ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : header.id}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>

                {hasFilterRow && (
                  <tr key={`${headerGroup.id}-filters`} className="border-b border-gray-200 bg-white">
                    {headerGroup.headers.map(header => (
                      <th key={`${header.id}-filter`} className="px-3 py-2">
                        {header.column.getCanFilter() ? (
                          header.column.columnDef.meta?.filterVariant === 'select' ? (
                            <ColumnSelectFilter
                              value={(header.column.getFilterValue() as string) ?? ''}
                              onChange={v => header.column.setFilterValue(v)}
                              options={header.column.columnDef.meta?.filterOptions ?? []}
                            />
                          ) : (
                            <ColumnTextFilter
                              value={(header.column.getFilterValue() as string) ?? ''}
                              onChange={v => header.column.setFilterValue(v)}
                              placeholder={header.column.columnDef.meta?.filterPlaceholder}
                            />
                          )
                        ) : null}
                      </th>
                    ))}
                  </tr>
                )}
              </>
            ))}
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {table.getVisibleLeafColumns().map(col => (
                    <td key={col.id} className="px-4 py-3.5">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.getVisibleLeafColumns().length}
                  className="px-4 py-12 text-center text-sm text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && !loading && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>
            {pagination.total === 0
              ? '0 records'
              : `Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total}`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page === 1}
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span>Page {pagination.page} of {totalPages}</span>
              <button
                disabled={pagination.page === totalPages}
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                className="px-2 py-1 border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
