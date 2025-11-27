import type { UserFilters } from '../types/user.types'

/**
 * Construye los query parameters para filtros de usuarios
 */
export function buildUserFiltersParams(filters: UserFilters): URLSearchParams {
    const params = new URLSearchParams()

    if (filters.search) {
        params.set('search', filters.search)
    }

    if (filters.status) {
        params.set('status', filters.status)
    }

    if (filters.role) {
        params.set('role', filters.role)
    }

    return params
}

/**
 * Verifica si hay filtros activos
 */
export function hasActiveFilters(filters: UserFilters): boolean {
    return Boolean(filters.search || filters.status || filters.role)
}

/**
 * Obtiene un resumen legible de los filtros activos
 */
export function getFiltersDescription(
    filters: UserFilters,
    roles: Array<{ id: number; code: string; name: string }>
): string {
    const parts: string[] = []

    if (filters.search) {
        parts.push(`Búsqueda: "${filters.search}"`)
    }

    if (filters.status) {
        const statusText = filters.status === 'active' ? 'Activos' : 'Inactivos'
        parts.push(`Estado: ${statusText}`)
    }

    if (filters.role) {
        const roleName = roles.find((r) => r.code === filters.role)?.name
        if (roleName) {
            parts.push(`Rol: ${roleName}`)
        }
    }

    return parts.join(' • ')
}
