"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  PaginationState,
} from "@tanstack/react-table"
import { Search, Filter, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Types
export interface DataTableConfig<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
  searchable?: boolean
  searchColumn?: string
  paginable?: boolean
  selectable?: boolean
  exportable?: boolean
  filterable?: boolean
  pageSizeOptions?: number[]
  defaultPageSize?: number
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export interface DataTableProps<TData> {
  config: DataTableConfig<TData>
  onRowClick?: (row: TData) => void
  onSelectionChange?: (selectedRows: TData[]) => void
  onExport?: (data: TData[]) => void
  actions?: (row: TData) => React.ReactNode
}

// Utility functions
const exportToCSV = <TData,>(data: TData[], columns: ColumnDef<TData>[]) => {
  const headers = columns
    .filter(col => col.id !== 'select' && col.id !== 'actions')
    .map(col => col.header as string)
  
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      columns
        .filter(col => col.id !== 'select' && col.id !== 'actions')
        .map(col => {
          const value = 'accessorKey' in col && col.accessorKey ? (row as Record<string, unknown>)[col.accessorKey as string] : ''
          return `"${String(value).replace(/"/g, '""')}"`
        })
        .join(',')
    )
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', 'export.csv')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Main DataTable component
export function DataTable<TData>({
  config,
  onRowClick,
  onSelectionChange,
  onExport,
  actions,
}: DataTableProps<TData>) {
  const {
    columns: initialColumns,
    data,
    searchable = false,
    searchColumn,
    paginable = true,
    selectable = false,
    exportable = false,
    filterable = false,
    pageSizeOptions = [10, 20, 30, 40, 50],
    defaultPageSize = 10,
    loading = false,
    emptyMessage = "No hay datos disponibles",
    className,
  } = config

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  })

  // Enhanced columns with selection and actions
  const columns = React.useMemo<ColumnDef<TData>[]>(() => {
    const cols = [...initialColumns]

    // Add selection column if selectable
    if (selectable) {
      cols.unshift({
        id: "select",
        header: ({ table }: { table: { getIsAllPageRowsSelected: () => boolean; getIsSomePageRowsSelected: () => boolean; toggleAllPageRowsSelected: (value: boolean) => void } }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Seleccionar todo"
          />
        ),
        cell: ({ row }: { row: { getIsSelected: () => boolean; toggleSelected: (value: boolean) => void } }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar fila"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      })
    }

    // Add actions column if actions provided
    if (actions) {
      cols.push({
        id: "actions",
        header: "Acciones",
        cell: ({ row }: { row: { original: TData } }) => actions(row.original),
        enableSorting: false,
        enableHiding: false,
      })
    }

    return cols
  }, [initialColumns, selectable, actions])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
    initialState: {
      pagination: {
        pageSize: defaultPageSize,
      },
    },
  })

  // Handle selection change
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)
      onSelectionChange(selectedRows)
    }
  }, [rowSelection, onSelectionChange, table])

  // Handle export
  const handleExport = () => {
    if (onExport) {
      onExport(data)
    } else {
      exportToCSV(data, initialColumns)
    }
  }

  const selectedRowsCount = table.getFilteredSelectedRowModel().rows.length

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {searchable && searchColumn && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Buscar por ${searchColumn}...`}
                value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn(searchColumn)?.setFilterValue(event.target.value)
                }
                className="pl-8 w-64"
              />
            </div>
          )}
          
          {filterable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mostrar columnas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {selectable && selectedRowsCount > 0 && (
            <Badge variant="secondary">
              {selectedRowsCount} seleccionado{selectedRowsCount !== 1 ? 's' : ''}
            </Badge>
          )}
          
          {exportable && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2">Cargando...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn(
                      onRowClick && "cursor-pointer hover:bg-muted/50"
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {paginable && (
        <div className="flex items-center justify-end space-x-2 py-4">
          {selectable && (
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} de{" "}
              {table.getFilteredRowModel().rows.length} fila(s) seleccionada(s).
            </div>
          )}
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Filas por página</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageSizeOptions.map((pageSize: number) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for creating table configurations
export function useDataTableConfig<TData>() {
  const createConfig = React.useCallback((
    config: Omit<DataTableConfig<TData>, 'columns' | 'data'>
  ) => config, [])

  return { createConfig }
}

// Pre-built column definitions
export const createColumnDefs = {
  text: <TData,>(key: keyof TData, title: string, options?: {
    sortable?: boolean
    searchable?: boolean
    width?: string
    align?: "left" | "center" | "right"
  }): ColumnDef<TData> => ({
    accessorKey: key as string,
    header: title,
    cell: ({ getValue }) => <div>{String(getValue())}</div>,
    enableSorting: options?.sortable ?? true,
    enableColumnFilter: options?.searchable ?? true,
  }),

  badge: <TData,>(key: keyof TData, title: string, options?: {
    variant?: "default" | "secondary" | "destructive" | "outline"
    getVariant?: (value: unknown) => "default" | "secondary" | "destructive" | "outline"
  }): ColumnDef<TData> => ({
    accessorKey: key as string,
    header: title,
    cell: ({ getValue }) => {
      const value = getValue()
      const variant = options?.getVariant ? options.getVariant(value) : options?.variant ?? "default"
      return <Badge variant={variant}>{String(value)}</Badge>
    },
  }),

  date: <TData,>(key: keyof TData, title: string, options?: {
    format?: string
  }): ColumnDef<TData> => ({
    accessorKey: key as string,
    header: title,
    cell: ({ getValue }) => {
      const value = getValue()
      if (!value) return "-"
      const date = new Date(value as string)
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        ...(options?.format && { format: options.format })
      })
    },
  }),

  currency: <TData,>(key: keyof TData, title: string, options?: {
    currency?: string
    locale?: string
  }): ColumnDef<TData> => ({
    accessorKey: key as string,
    header: title,
    cell: ({ getValue }) => {
      const value = getValue() as number
      if (typeof value !== 'number') return "-"
      return new Intl.NumberFormat(options?.locale ?? 'es-ES', {
        style: 'currency',
        currency: options?.currency ?? 'USD',
      }).format(value)
    },
  }),

  actions: <TData,>(actions: (row: TData) => React.ReactNode): ColumnDef<TData> => ({
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => actions(row.original),
    enableSorting: false,
    enableHiding: false,
  }),
}
