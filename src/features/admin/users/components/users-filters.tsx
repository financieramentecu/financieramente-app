'use client'

import React from 'react'
import { Search, Filter, X, ListFilter } from 'lucide-react'
import { Input } from '@/features/shared/ui/input'
import { Button } from '@/features/shared/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/features/shared/ui/select'
import { Badge } from '@/features/shared/ui/badge'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from '@/features/shared/ui/sheet'
import type { UserFilters } from '../types/user.types'
import { useDebounce } from '../hooks/use-debounce'
import {
    hasActiveFilters,
    getFiltersDescription,
} from '../utils/filter.utils'
import {
    DEBOUNCE_DELAY,
    UI_TEXT,
} from '../constants/user-management.constants'

interface UsersFiltersProps {
    filters: UserFilters
    onFiltersChange: (filters: UserFilters) => void
    roles: Array<{ id: number; code: string; name: string }>
}

export function UsersFilters({
    filters,
    onFiltersChange,
    roles,
}: UsersFiltersProps) {
    const [searchInput, setSearchInput] = React.useState(filters.search || '')
    const debouncedSearch = useDebounce(searchInput, DEBOUNCE_DELAY)

    // Update filters when debounced search changes
    React.useEffect(() => {
        if (debouncedSearch !== filters.search) {
            onFiltersChange({
                ...filters,
                search: debouncedSearch || undefined,
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch])

    const handleStatusChange = (value: string) => {
        onFiltersChange({
            ...filters,
            status: value === 'all' ? undefined : (value as 'active' | 'inactive'),
        })
    }

    const handleRoleChange = (value: string) => {
        onFiltersChange({
            ...filters,
            role: value === 'all' ? undefined : value,
        })
    }

    const handleClearFilters = () => {
        setSearchInput('')
        onFiltersChange({})
    }

    const filtersActive = hasActiveFilters(filters)
    const filtersDescription = getFiltersDescription(filters, roles)

    // Count active filters (excluding search for the mobile toggle badge)
    const activeFiltersCount = [
        filters.status,
        filters.role,
    ].filter(Boolean).length

    const SearchInput = (
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                placeholder={UI_TEXT.SEARCH_PLACEHOLDER}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
                aria-label="Buscar usuarios"
            />
        </div>
    )

    const StatusSelect = (
        <Select
            value={filters.status || 'all'}
            onValueChange={handleStatusChange}
        >
            <SelectTrigger aria-label="Filtrar por estado">
                <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{UI_TEXT.ALL_STATUSES}</SelectItem>
                <SelectItem value="active">{UI_TEXT.ACTIVE}</SelectItem>
                <SelectItem value="inactive">{UI_TEXT.INACTIVE}</SelectItem>
            </SelectContent>
        </Select>
    )

    const RoleSelect = (
        <Select value={filters.role || 'all'} onValueChange={handleRoleChange}>
            <SelectTrigger aria-label="Filtrar por rol">
                <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{UI_TEXT.ALL_ROLES}</SelectItem>
                {roles.map((role) => (
                    <SelectItem key={role.id} value={role.code}>
                        {role.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )

    return (
        <div className="space-y-4">
            {/* Desktop and Header (Title) */}
            <div className="hidden md:flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">{UI_TEXT.FILTERS_TITLE}</h3>
                {filtersActive && (
                    <Badge variant="secondary" className="ml-2">
                        {UI_TEXT.FILTERS_ACTIVE}
                    </Badge>
                )}
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:grid gap-4 md:grid-cols-3">
                {SearchInput}
                {StatusSelect}
                {RoleSelect}
            </div>

            {/* Mobile Layout */}
            <div className="flex md:hidden items-center gap-2">
                {SearchInput}

                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="relative shrink-0">
                            <ListFilter className="h-5 w-5" />
                            {activeFiltersCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[40vh] px-6">
                        <SheetHeader className="text-left px-0">
                            <SheetTitle>{UI_TEXT.MORE_FILTERS}</SheetTitle>
                            <SheetDescription>
                                Ajusta los criterios de búsqueda para refinar los resultados.
                            </SheetDescription>
                        </SheetHeader>

                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Estado</label>
                                {StatusSelect}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rol</label>
                                {RoleSelect}
                            </div>
                        </div>

                        <SheetFooter className="flex-row items-center justify-between border-t pt-4 px-0 pb-6 mt-0">
                            <p className="text-xs text-muted-foreground line-clamp-1 flex-1 mr-4">
                                {filtersActive ? filtersDescription : 'Sin filtros aplicados'}
                            </p>
                            {filtersActive && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearFilters}
                                    className="gap-2 shrink-0 h-8"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    {UI_TEXT.CLEAR_FILTERS}
                                </Button>
                            )}
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Clear Filters (Desktop only) */}
            {filtersActive && (
                <div className="hidden md:flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">{filtersDescription}</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="gap-2 cursor-pointer"
                        aria-label="Limpiar todos los filtros"
                    >
                        <X className="h-4 w-4" />
                        {UI_TEXT.CLEAR_FILTERS}
                    </Button>
                </div>
            )}
        </div>
    )
}
