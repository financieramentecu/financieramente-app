import {
    buildUserFiltersParams,
    hasActiveFilters,
    getFiltersDescription,
} from '../filter.utils'
import type { UserFilters } from '../../types/user.types'

describe('filter.utils', () => {
    const mockRoles = [
        { id: 1, code: 'ADMIN', name: 'Administrador' },
        { id: 2, code: 'USER', name: 'Usuario' },
        { id: 3, code: 'AGENT', name: 'Agente' },
    ]

    describe('buildUserFiltersParams', () => {
        it('should return empty params for empty filters', () => {
            const params = buildUserFiltersParams({})
            expect(params.toString()).toBe('')
        })

        it('should include search param', () => {
            const filters: UserFilters = { search: 'john' }
            const params = buildUserFiltersParams(filters)
            expect(params.get('search')).toBe('john')
        })

        it('should include status param', () => {
            const filters: UserFilters = { status: 'active' }
            const params = buildUserFiltersParams(filters)
            expect(params.get('status')).toBe('active')
        })

        it('should include role param', () => {
            const filters: UserFilters = { role: 'ADMIN' }
            const params = buildUserFiltersParams(filters)
            expect(params.get('role')).toBe('ADMIN')
        })

        it('should include all params when all filters are set', () => {
            const filters: UserFilters = {
                search: 'john',
                status: 'active',
                role: 'ADMIN',
            }
            const params = buildUserFiltersParams(filters)
            expect(params.get('search')).toBe('john')
            expect(params.get('status')).toBe('active')
            expect(params.get('role')).toBe('ADMIN')
        })
    })

    describe('hasActiveFilters', () => {
        it('should return false for empty filters', () => {
            expect(hasActiveFilters({})).toBe(false)
        })

        it('should return true when search is set', () => {
            expect(hasActiveFilters({ search: 'john' })).toBe(true)
        })

        it('should return true when status is set', () => {
            expect(hasActiveFilters({ status: 'active' })).toBe(true)
        })

        it('should return true when role is set', () => {
            expect(hasActiveFilters({ role: 'ADMIN' })).toBe(true)
        })

        it('should return true when any filter is set', () => {
            expect(
                hasActiveFilters({
                    search: 'john',
                    status: 'active',
                    role: 'ADMIN',
                })
            ).toBe(true)
        })
    })

    describe('getFiltersDescription', () => {
        it('should return empty string for no filters', () => {
            const description = getFiltersDescription({}, mockRoles)
            expect(description).toBe('')
        })

        it('should include search in description', () => {
            const filters: UserFilters = { search: 'john' }
            const description = getFiltersDescription(filters, mockRoles)
            expect(description).toContain('Búsqueda: "john"')
        })

        it('should include active status in description', () => {
            const filters: UserFilters = { status: 'active' }
            const description = getFiltersDescription(filters, mockRoles)
            expect(description).toContain('Estado: Activos')
        })

        it('should include inactive status in description', () => {
            const filters: UserFilters = { status: 'inactive' }
            const description = getFiltersDescription(filters, mockRoles)
            expect(description).toContain('Estado: Inactivos')
        })

        it('should include role name in description', () => {
            const filters: UserFilters = { role: 'ADMIN' }
            const description = getFiltersDescription(filters, mockRoles)
            expect(description).toContain('Rol: Administrador')
        })

        it('should combine multiple filters with bullet separator', () => {
            const filters: UserFilters = {
                search: 'john',
                status: 'active',
                role: 'ADMIN',
            }
            const description = getFiltersDescription(filters, mockRoles)
            expect(description).toContain('Búsqueda: "john"')
            expect(description).toContain('Estado: Activos')
            expect(description).toContain('Rol: Administrador')
            expect(description).toContain('•')
        })

        it('should handle role not found', () => {
            const filters: UserFilters = { role: 'UNKNOWN' }
            const description = getFiltersDescription(filters, mockRoles)
            expect(description).toBe('')
        })
    })
})
