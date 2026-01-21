'use client'

import React from 'react'
import { Search, Filter, X } from 'lucide-react'
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

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Filtros</h3>
                {filtersActive && (
                    <Badge variant="secondary" className="ml-2">
                        {UI_TEXT.FILTERS_ACTIVE}
                    </Badge>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={UI_TEXT.SEARCH_PLACEHOLDER}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-9"
                        aria-label="Buscar usuarios"
                    />
                </div>

                {/* Status Filter */}
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

                {/* Role Filter */}
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
            </div>

            {/* Clear Filters */}
            {filtersActive && (
                <div className="flex items-center justify-between pt-2">
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
