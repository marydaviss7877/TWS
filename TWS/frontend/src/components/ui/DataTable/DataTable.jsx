import * as React from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel,
  getFilteredRowModel, getExpandedRowModel, flexRender,
} from '@tanstack/react-table';
import { ChevronUpIcon, ChevronDownIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../Table/Table';
import { Checkbox } from '../Checkbox/Checkbox';
import { Button } from '../Button/Button';
import { cn } from '../../../lib/utils';

/**
 * Canonical data-table primitive — the Radix/TanStack replacement for antd's `Table`.
 * Covers every capability actually used across the antd Table call sites in this app:
 * sorting, row selection, pagination, per-column filters, and expandable subrows.
 *
 * Usage:
 *   const columns = [
 *     { accessorKey: 'name', header: 'Name', enableSorting: true },
 *     { accessorKey: 'status', header: 'Status', enableColumnFilter: true },
 *   ];
 *   <DataTable columns={columns} data={rows} enableRowSelection pageSize={10} />
 *
 * Expandable subrows: pass `getSubRows={(row) => row.children}` — a chevron column is
 * added automatically for any row with children.
 *
 * `enableRowSelection` also accepts a predicate `(row) => boolean` to disable selection
 * on individual rows (e.g. cancelled invoices).
 */
const DataTable = ({
  columns,
  data,
  enableRowSelection = false,
  onRowSelectionChange,
  getSubRows,
  pageSize = 10,
  emptyMessage = 'No data',
  onRowClick,
  className,
}) => {
  const [sorting, setSorting] = React.useState([]);
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [expanded, setExpanded] = React.useState({});

  const tableColumns = React.useMemo(() => {
    const cols = [...columns];
    if (enableRowSelection) {
      cols.unshift({
        id: '__select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableColumnFilter: false,
      });
    }
    return cols;
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, columnFilters, rowSelection, expanded },
    enableRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: (updater) => {
      setRowSelection(updater);
      if (onRowSelectionChange) {
        const next = typeof updater === 'function' ? updater(rowSelection) : updater;
        onRowSelectionChange(next);
      }
    },
    onExpandedChange: setExpanded,
    getSubRows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getSubRows ? getExpandedRowModel() : undefined,
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  return (
    <div className={cn('space-y-3', className)}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : (
                    <div className="space-y-1">
                      <button
                        type="button"
                        className={cn(
                          'flex items-center gap-1',
                          header.column.getCanSort() && 'cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100'
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                        disabled={!header.column.getCanSort()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          {
                            asc: <ChevronUpIcon className="h-3 w-3" />,
                            desc: <ChevronDownIcon className="h-3 w-3" />,
                          }[header.column.getIsSorted()] || <span className="h-3 w-3" />
                        )}
                      </button>
                      {header.column.getCanFilter() && (
                        <input
                          type="text"
                          value={header.column.getFilterValue() ?? ''}
                          onChange={(e) => header.column.setFilterValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Filter…"
                          className="w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1.5 py-0.5 text-xs font-normal normal-case text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      )}
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? 'selected' : undefined}
                onClick={() => onRowClick?.(row.original)}
                className={onRowClick ? 'cursor-pointer' : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {cell.column.id === tableColumns.find((c) => c.id !== '__select')?.id &&
                      getSubRows &&
                      row.getCanExpand() && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
                          className="mr-1 inline-flex align-middle text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          <ChevronRightIcon className={cn('h-3.5 w-3.5 transition-transform', row.getIsExpanded() && 'rotate-90')} />
                        </button>
                      )}
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={tableColumns.length} className="h-24 text-center text-gray-500 dark:text-gray-400">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {enableRowSelection && `${table.getFilteredSelectedRowModel().rows.length} of `}
          {table.getFilteredRowModel().rows.length} row(s)
          {enableRowSelection && ' selected'}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export { DataTable };
