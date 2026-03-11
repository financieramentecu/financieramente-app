'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/features/shared/ui/table'
import { Input } from '@/features/shared/ui/input'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/features/shared/ui/select'
import { useCategoryTypes } from '../hooks/use-category-types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Plus, Edit, ChevronLeft, ChevronRight } from 'lucide-react'
import { useDebounce } from '@/features/shared/hooks/use-debounce'
import { Switch } from '@/features/shared/ui/switch'
import { useCategoryTypeMutations } from '../hooks/use-category-type-mutations'
import { CategoryType } from '../types/category-type.types'

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
    const { toggleCategoryTypeStatus } = useCategoryTypeMutations()
    const loading = status === 'loading'

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

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead className="hidden md:table-cell">Descripción</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="hidden lg:table-cell">Modificado</TableHead>
                            <TableHead className="w-[100px] text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    Cargando...
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-red-500 h-24">
                                    Error al cargar los tipos de categoría
                                </TableCell>
                            </TableRow>
                        ) : !data?.categoryTypes.length ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    No se encontraron resultados
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.categoryTypes.map((type: CategoryType) => (
                                <TableRow key={type.id}>
                                    <TableCell className="font-medium">{type.name}</TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        {type.description || <span className="text-muted-foreground italic">Sin descripción</span>}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={type.status}
                                                onCheckedChange={() => handleToggleStatus(type.id, type.status)}
                                                disabled={loading}
                                            />
                                            <Badge variant={type.status ? 'default' : 'secondary'}>
                                                {type.status ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        {format(new Date(type.updatedAt), 'dd MMM yyyy', { locale: es })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => router.push(`/dashboard/admin/category-types/editar/${type.id}`)}
                                        >
                                            <Edit className="h-4 w-4" />
                                            <span className="sr-only">Editar</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
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
        </div>
    )
}
