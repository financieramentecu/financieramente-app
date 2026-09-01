import { describe, it, expect } from 'vitest'
import { isHierarchyBypassRole, HIERARCHY_BYPASS_ROLES } from '../hierarchy'
import { UserRole, WRITE_BYPASS_ROLES } from '../roles'

describe.each([
	{ role: UserRole.ADMIN, expected: true },
	{ role: UserRole.ASISTENTE_GERENCIA_OPERATIVA, expected: true },
	{ role: UserRole.ANALISTA_SOPORTE, expected: true },
	{ role: UserRole.AGENTE, expected: false },
	{ role: UserRole.DEFAULT, expected: false },
	{ role: UserRole.CONSULTOR, expected: true },
])('isHierarchyBypassRole($role)', ({ role, expected }) => {
	it(`returns ${expected}`, () => {
		expect(isHierarchyBypassRole(role)).toBe(expected)
	})
})

describe('isHierarchyBypassRole edge cases', () => {
	it('returns false for undefined', () => {
		expect(isHierarchyBypassRole(undefined)).toBe(false)
	})

	it('returns false for null', () => {
		expect(isHierarchyBypassRole(null)).toBe(false)
	})
})

describe('HIERARCHY_BYPASS_ROLES (write-only list, kept for compat)', () => {
	it('remains exactly WRITE_BYPASS_ROLES — write semantics, not visibility', () => {
		expect(HIERARCHY_BYPASS_ROLES).toEqual(WRITE_BYPASS_ROLES)
	})

	it('does NOT include CONSULTOR', () => {
		expect(HIERARCHY_BYPASS_ROLES).not.toContain(UserRole.CONSULTOR)
	})
})
