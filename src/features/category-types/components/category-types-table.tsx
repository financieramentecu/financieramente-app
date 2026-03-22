'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/features/shared/ui/input'
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

import { useCategoryTypes } from '../hooks/use-category-types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Plus, Edit, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { useDebounce } from '@/features/shared/hooks/use-debounce'
import { useCategoryTypeMutations } from '../hooks/use-category-type-mutations'
import { CategoryType } from '../types/category-type.types'


function StatusBadge({ status }: { status: boolean }) {
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={
                status
                    ? { backgroundColor: '#dcfce7', color: '#166534' }
                    : { backgroundColor: '#F1F5F5', color: '#529398' }
            }
        >
            <span
                className="inline-block rounded-full"
                style={{
                    width: 5,
                    height: 5,
                    backgroundColor: status ? '#16A34A' : '#DDE9EB',
                    flexShrink: 0,
                }}
            />
            {status ? 'Activo' : 'Inactivo'}
        </span>
    )
}

export function CategoryTypesTable() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const currentSearch = searchParams.get('search') || ''
    const currentStatus = searchParams.get('status') || ''
    const currentPage = Number(searchParams.get('page')) || 1

    const [searchTerm, setSearchTerm] = useState(currentSearch)
    const [statusFilter, setStatusFilter] = useState(currentStatus)
    const debouncedSearch = useDebounce(searchTerm, 500)

    const debouncedFilters = { search: debouncedSearch, status: statusFilter }

    const { data, status, error, setPage, refetch } = useCategoryTypes(
        debouncedFilters,
        currentPage,
        10
    )
    const { toggleCategoryTypeStatus, deleteCategoryType } = useCategoryTypeMutations()
    const [deleteId, setDeleteId] = useState<number | null>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const loading = status === 'loading'
    
    const handleDeleteClick = (id: number) => {
        setDeleteId(id)
        setIsDeleteDialogOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (deleteId !== null) {
            const success = await deleteCategoryType(deleteId)
            if (success) {
                refetch()
            }
            setDeleteId(null)
            setIsDeleteDialogOpen(false)
        }
    }


    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {

        setSearchTerm(e.target.value)
        updateQueryParams('search', e.target.value)
    }

    const handleStatusChange = (value: string) => {
        const newStatus = value === 'all' ? '' : value
        setStatusFilter(newStatus)
        updateQueryParams('status', newStatus)
    }

    const handlePageChange = (newPage: number) => {
        setPage(newPage)
        updateQueryParams('page', newPage.toString())
    }

    const handleToggleStatus = async (id: number, currentStatus: boolean) => {
        const success = await toggleCategoryTypeStatus(id, currentStatus)
        if (success) {
            refetch()
        }
    }

    const updateQueryParams = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams)
        if (value) {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        if (key !== 'page') {
            params.delete('page')
            setPage(1)
        }
        router.replace(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex flex-1 items-center space-x-2">
                    <div className="relative w-full sm:w-[300px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar tipo de categoría..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <Select value={statusFilter || 'all'} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los estados</SelectItem>
                            <SelectItem value="true">Activos</SelectItem>
                            <SelectItem value="false">Inactivos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => router.push('/dashboard/admin/category-types/crear')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Tipo
                </Button>
            </div>

            <div
                className="overflow-hidden rounded-lg"
                style={{
                    border: '1px solid #DDE9EB',
                    boxShadow: '0 1px 3px #0000000D',
                    backgroundColor: '#FFFFFF',
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center px-4"
                    style={{
                        backgroundColor: '#F1F5F5',
                        height: 40,
                        borderBottom: '1px solid #DDE9EB',
                    }}
                >
                    <span className="w-[280px] text-[11px] font-semibold tracking-[0.5px] shrink-0" style={{ color: '#529398' }}>
                        NOMBRE / DESCRIPCIÓN
                    </span>
                    <span className="w-[120px] text-[11px] font-semibold tracking-[0.5px] shrink-0" style={{ color: '#529398' }}>
                        ESTADO
                    </span>
                    <span className="w-[140px] text-[11px] font-semibold tracking-[0.5px] shrink-0" style={{ color: '#529398' }}>
                        MODIFICADO
                    </span>
                    <span className="flex-1 text-right text-[11px] font-semibold tracking-[0.5px]" style={{ color: '#529398' }}>
                        ACCIONES
                    </span>
                </div>

                {/* Rows */}
                {loading ? (
                    <div className="py-10 text-center text-sm" style={{ color: '#529398' }}>
                        Cargando...
                    </div>
                ) : error ? (
                    <div className="py-10 text-center text-sm text-red-500">
                        Error al cargar los tipos de categoría
                    </div>
                ) : !data?.categoryTypes.length ? (
                    <div className="py-10 text-center text-sm" style={{ color: '#529398' }}>
                        No se encontraron resultados
                    </div>
                ) : (
                    data.categoryTypes.map((type: CategoryType, idx: number) => {
                        const isLast = idx === data.categoryTypes.length - 1
                        return (
                            <div
                                key={type.id}
                                className="flex items-center px-4"
                                style={{
                                    backgroundColor: type.status ? '#FFFFFF' : '#FAFAFA',
                                    height: 54,
                                    borderBottom: isLast ? 'none' : '1px solid #F1F5F5',
                                }}
                            >
                                {/* Nombre + descripción */}
                                <div className="w-[280px] shrink-0 flex flex-col justify-center gap-0.5">
                                    <span
                                        className="text-[13px] font-medium leading-tight"
                                        style={{ color: type.status ? '#111827' : '#529398' }}
                                    >
                                        {type.name}
                                    </span>
                                    <span className="text-[11px] truncate pr-4" style={{ color: type.status ? '#529398' : '#DDE9EB' }}>
                                        {type.description || <span className="italic">Sin descripción</span>}
                                    </span>
                                </div>

                                {/* Estado */}
                                <div className="w-[120px] shrink-0">
                                    <StatusBadge status={type.status} />
                                </div>

                                {/* Modificado */}
                                <div className="w-[140px] shrink-0">
                                    <span className="text-[12px]" style={{ color: type.status ? '#529398' : '#DDE9EB' }}>
                                        {format(new Date(type.updatedAt), 'dd MMM yyyy', { locale: es })}
                                    </span>
                                </div>

                                {/* Acciones */}
                                <div className="flex-1 flex justify-end gap-2">
                                    <button
                                        onClick={() => router.push(`/dashboard/admin/category-types/editar/${type.id}`)}
                                        className="cursor-pointer rounded-md px-1 py-1 hover:bg-slate-100 transition-colors"
                                    >
                                        <Edit className="h-4 w-4 text-slate-500" />
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(type.id, type.status)}
                                        className="cursor-pointer rounded-md px-2.5 py-1 text-[12px] font-medium transition-opacity hover:opacity-80"
                                        style={
                                            type.status
                                                ? { backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#ED4337' }
                                                : { backgroundColor: '#F1FDF4', border: '1px solid #DCFCE7', color: '#166534' }
                                        }
                                    >
                                        {type.status ? 'Inactivar' : 'Activar'}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(type.id)}
                                        className="cursor-pointer rounded-md px-1.5 py-1 hover:bg-red-50 transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </button>


                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {data && data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(data.pagination.page - 1)}
                        disabled={data.pagination.page === 1 || loading}
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                    </Button>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                        Página {data.pagination.page} de {data.pagination.totalPages}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(data.pagination.page + 1)}
                        disabled={data.pagination.page === data.pagination.totalPages || loading}
                    >
                        Siguiente
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            )}

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro de que desea eliminar?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el
                            tipo de categoría si no tiene subcategorías o referencias activas.
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
