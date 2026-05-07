'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/features/shared/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/features/shared/ui/alert-dialog'
import { DataTable } from '@/features/shared/ui/DataTable'
import { useDataTableURLState } from '@/features/shared/ui/DataTable/useDataTableURLState'

import { useCategoryTypes } from '../hooks/use-category-types'
import { useCategoryTypeMutations } from '../hooks/use-category-type-mutations'
import { getCategoryTypesColumns } from './category-types-columns'
import { CategoryType } from '../types/category-type.types'

export function CategoryTypesTable() {
    // --- State & URL Sync ---
    const { pagination: urlPagination, columnFilters, setURLState } = useDataTableURLState()
    
    // Extract filters from TanStack structure
    const searchFilter = columnFilters.find(f => f.id === 'search')?.value as string || ''
    const statusFilter = columnFilters.find(f => f.id === 'status')?.value as string || ''
    
    const filters = useMemo(() => ({
        search: searchFilter,
        status: statusFilter
    }), [searchFilter, statusFilter])

    const { data, status, refetch, setPage } = useCategoryTypes(
        filters,
        urlPagination.pageIndex + 1,
        urlPagination.pageSize
    )

    // --- Mutations ---
    const { toggleCategoryTypeStatus, deleteCategoryType } = useCategoryTypeMutations()
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

    // --- Handlers ---
    const handleToggleStatus = useCallback(async (e: React.MouseEvent, id: number, currentStatus: boolean) => {
        e.preventDefault()
        e.stopPropagation()
        const success = await toggleCategoryTypeStatus(id, currentStatus)
        if (success) refetch()
    }, [toggleCategoryTypeStatus, refetch])

    const handleDeleteClick = useCallback((e: React.MouseEvent, id: number) => {
        e.preventDefault()
        e.stopPropagation()
        setDeleteId(id)
        setIsDeleteDialogOpen(true)
    }, [])

    const handleConfirmDelete = async () => {
        if (deleteId !== null) {
            const success = await deleteCategoryType(deleteId)
            if (success) refetch()
            setDeleteId(null)
            setIsDeleteDialogOpen(false)
        }
    }

    // --- DataTable Config ---
    const columns = useMemo(() => getCategoryTypesColumns(), [])

    const handleGlobalSearch = useCallback((query: string) => {
        setURLState({
            filters: [
                ...columnFilters.filter(f => f.id !== 'search'),
                ...(query ? [{ id: 'search', value: query }] : [])
            ],
            pagination: { ...urlPagination, pageIndex: 0 }
        })
    }, [columnFilters, urlPagination, setURLState])

    const handleStatusChange = useCallback((value: string) => {
        const nextStatus = value === 'all' ? '' : value
        setURLState({
            filters: [
                ...columnFilters.filter(f => f.id !== 'status'),
                ...(nextStatus ? [{ id: 'status', value: nextStatus }] : [])
            ],
            pagination: { ...urlPagination, pageIndex: 0 }
        })
    }, [columnFilters, urlPagination, setURLState])

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage)
        setURLState({
            pagination: { ...urlPagination, pageIndex: newPage - 1 }
        })
    }, [urlPagination, setPage, setURLState])

    const renderAdditionalFilters = useCallback(() => (
        <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
            </SelectContent>
        </Select>
    ), [statusFilter, handleStatusChange])

    const renderActions = useCallback((type: CategoryType) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
                variant="ghost"
                size="icon"
                asChild
                title="Editar"
                className="h-8 w-8 cursor-pointer"
            >
                <Link href={`/dashboard/admin/category-types/editar/${type.id}`}>
                    <Pencil className="h-4 w-4" />
                </Link>
            </Button>
            
            {type.status ? (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDeleteClick(e, type.id)}
                    title="Eliminar"
                    className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            ) : (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleToggleStatus(e, type.id, type.status)}
                    title="Restaurar"
                    className="h-8 w-8 text-emerald-500 hover:text-emerald-600 cursor-pointer"
                >
                    <RotateCcw className="h-4 w-4" />
                </Button>
            )}
        </div>
    ), [handleToggleStatus, handleDeleteClick])

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-semibold">Tipos de Categoría</h2>
                <Button asChild className="cursor-pointer">
                    <Link href="/dashboard/admin/category-types/crear">
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Tipo
                    </Link>
                </Button>
            </div>

            <DataTable
                data={data?.categoryTypes || []}
                columns={columns}
                loading={status === 'loading'}
                searchable
                searchPlaceholder="Buscar tipo de categoría..."
                onGlobalSearch={handleGlobalSearch}
                manualPagination
                currentPage={data?.pagination.page}
                pageSize={data?.pagination.pageSize}
                totalItems={data?.pagination.total}
                onPageChange={handlePageChange}
                renderAdditionalFilters={renderAdditionalFilters}
                actions={renderActions}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro de que desea eliminar?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción realizará una eliminación lógica (inactivación). 
                            El tipo de categoría permanecerá en el sistema pero no podrá ser seleccionado en nuevos registros.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteId(null)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
