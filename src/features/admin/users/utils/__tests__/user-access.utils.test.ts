import {
    hasNoRole,
    hasDefaultRole,
    isInactive,
    hasAccessIssue,
    getAccessIssues,
    isDefaultRole,
} from '../user-access.utils'
import { UserRole } from '@/features/auth/lib/roles'
import type { User } from '../../types/user.types'

describe('user-access.utils', () => {
    const mockActiveUserWithRole: User = {
        id: 1,
        name: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        avatar: null,
        active: true,
        role: {
            id: 1,
            code: UserRole.ADMIN,
            name: 'Administrador',
        },
        category: null,
        level: null,
        leader: null,
        createdAt: new Date(),
        lastLogin: null,
    }

    const mockInactiveUser: User = {
        ...mockActiveUserWithRole,
        active: false,
    }

    const mockUserWithoutRole: User = {
        ...mockActiveUserWithRole,
        role: null,
    }

    const mockUserWithDefaultRole: User = {
        ...mockActiveUserWithRole,
        role: {
            id: 2,
            code: UserRole.DEFAULT,
            name: 'Default',
        },
    }

    describe('hasNoRole', () => {
        it('should return true when user has no role', () => {
            expect(hasNoRole(mockUserWithoutRole)).toBe(true)
        })

        it('should return false when user has a role', () => {
            expect(hasNoRole(mockActiveUserWithRole)).toBe(false)
        })

        it('should return true when user is null', () => {
            expect(hasNoRole(null)).toBe(true)
        })

        it('should return true when user is undefined', () => {
            expect(hasNoRole(undefined)).toBe(true)
        })
    })

    describe('hasDefaultRole', () => {
        it('should return true when user has DEFAULT role', () => {
            expect(hasDefaultRole(mockUserWithDefaultRole)).toBe(true)
        })

        it('should return false when user has non-DEFAULT role', () => {
            expect(hasDefaultRole(mockActiveUserWithRole)).toBe(false)
        })

        it('should return false when user has no role', () => {
            expect(hasDefaultRole(mockUserWithoutRole)).toBe(false)
        })

        it('should return false when user is null', () => {
            expect(hasDefaultRole(null)).toBe(false)
        })
    })

    describe('isInactive', () => {
        it('should return true when user is inactive', () => {
            expect(isInactive(mockInactiveUser)).toBe(true)
        })

        it('should return false when user is active', () => {
            expect(isInactive(mockActiveUserWithRole)).toBe(false)
        })

        it('should return false when user is null', () => {
            expect(isInactive(null)).toBe(false)
        })
    })

    describe('hasAccessIssue', () => {
        it('should return false for active user with valid role', () => {
            expect(hasAccessIssue(mockActiveUserWithRole)).toBe(false)
        })

        it('should return true for inactive user', () => {
            expect(hasAccessIssue(mockInactiveUser)).toBe(true)
        })

        it('should return true for user without role', () => {
            expect(hasAccessIssue(mockUserWithoutRole)).toBe(true)
        })

        it('should return true for user with DEFAULT role', () => {
            expect(hasAccessIssue(mockUserWithDefaultRole)).toBe(true)
        })

        it('should return true when user is null', () => {
            expect(hasAccessIssue(null)).toBe(true)
        })
    })

    describe('getAccessIssues', () => {
        it('should return empty array for user with no issues', () => {
            const issues = getAccessIssues(mockActiveUserWithRole)
            expect(issues).toEqual([])
        })

        it('should return inactive issue', () => {
            const issues = getAccessIssues(mockInactiveUser)
            expect(issues).toHaveLength(1)
            expect(issues[0]).toContain('inactivo')
        })

        it('should return no role issue', () => {
            const issues = getAccessIssues(mockUserWithoutRole)
            expect(issues).toHaveLength(1)
            expect(issues[0]).toContain('no tiene un rol asignado')
        })

        it('should return DEFAULT role issue', () => {
            const issues = getAccessIssues(mockUserWithDefaultRole)
            expect(issues).toHaveLength(1)
            expect(issues[0]).toContain('DEFAULT')
        })

        it('should return multiple issues', () => {
            const userWithMultipleIssues: User = {
                ...mockInactiveUser,
                role: null,
            }
            const issues = getAccessIssues(userWithMultipleIssues)
            expect(issues).toHaveLength(2)
        })
    })

    describe('isDefaultRole', () => {
        it('should return true for DEFAULT role code', () => {
            expect(isDefaultRole(UserRole.DEFAULT)).toBe(true)
        })

        it('should return false for non-DEFAULT role code', () => {
            expect(isDefaultRole(UserRole.ADMIN)).toBe(false)
        })

        it('should return false for null', () => {
            expect(isDefaultRole(null)).toBe(false)
        })

        it('should return false for undefined', () => {
            expect(isDefaultRole(undefined)).toBe(false)
        })
    })
})
