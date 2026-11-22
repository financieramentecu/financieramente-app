import { describe, expect, it } from 'vitest'
import { DEFAULT_ROLE_GRANTS } from '@/features/access-control/catalog/default-role-grants'
import { UserRole } from '@/features/auth/lib/roles'
import { canAccessCrm, canLeadMoneyStrategies, canManageCrm } from '@/features/leads/crm/crm-policy'

describe('CRM policy', () => {
	it('fails closed without grants', () => {
		expect(canAccessCrm(undefined)).toBe(false)
		expect(canAccessCrm({})).toBe(false)
		expect(canManageCrm(null)).toBe(false)
	})

	it('opens and manages the CRM for the roles that hold leads.gestionar', () => {
		for (const role of [
			UserRole.ADMIN,
			UserRole.ASISTENTE_GERENCIA_OPERATIVA,
			UserRole.ANALISTA_SOPORTE,
			UserRole.AGENTE,
		]) {
			expect(canAccessCrm(DEFAULT_ROLE_GRANTS[role])).toBe(true)
			expect(canManageCrm(DEFAULT_ROLE_GRANTS[role])).toBe(true)
		}
	})

	it('keeps the read-only consultant and the external partner out of CRM writes', () => {
		expect(canManageCrm(DEFAULT_ROLE_GRANTS[UserRole.CONSULTOR])).toBe(false)
		expect(canManageCrm(DEFAULT_ROLE_GRANTS[UserRole.PARTNER])).toBe(false)
		expect(canManageCrm(DEFAULT_ROLE_GRANTS[UserRole.SIN_ROL])).toBe(false)
	})

	it('lets whoever may reassign any lead handle Money Strategies', () => {
		expect(canLeadMoneyStrategies(true, [], 1)).toBe(true)
	})

	it('lets someone who leads other people handle Money Strategies', () => {
		expect(canLeadMoneyStrategies(false, [7, 8], 7)).toBe(true)
		expect(canLeadMoneyStrategies(false, [4, 9], 4)).toBe(true)
	})

	it('keeps a leaf advisor on read-only Money Strategies', () => {
		expect(canLeadMoneyStrategies(false, [7], 7)).toBe(false)
		expect(canLeadMoneyStrategies(false, [], 4)).toBe(false)
	})
})
