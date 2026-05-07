'use client'

import { ColumnDef } from '@tanstack/react-table'
import { CategoryType } from '../types/category-type.types'
import { DataTableColumnHeader } from '@/features/shared/ui/DataTable/DataTableColumnHeader'
import { Badge } from '@/features/shared/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const getCategoryTypesColumns = (): ColumnDef<CategoryType>[] => [
    {
        accessorKey: 'name',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="NOMBRE / DESCRIPCIÓN" />
        ),
        cell: ({ row }) => (
            <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium leading-tight text-foreground">
                    {row.original.name}
                </span>
                <span className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                    {row.original.description || <span className="italic">Sin descripción</span>}
                </span>
            </div>
        ),
    },
    {
        accessorKey: 'status',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="ESTADO" />
        ),
        cell: ({ row }) => {
            const status = row.original.status
            return (
                <Badge variant={status ? 'success' : 'neutral'}>
                    {status ? 'Activo' : 'Inactivo'}
                </Badge>
            )
        },
    },
    {
        accessorKey: 'updatedAt',
        header: ({ column }) => (
            <DataTableColumnHeader column={column} title="MODIFICADO" />
        ),
        cell: ({ row }) => {
            const date = new Date(row.original.updatedAt)
            return (
                <span className="text-[12px] text-muted-foreground">
                    {format(date, 'dd MMM yyyy', { locale: es })}
                </span>
            )
        },
    },
]
