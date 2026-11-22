import { describe, expect, it } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { canAccessCrm, canLeadMoneyStrategies, canManageCrm } from '@/features/leads/crm/crm-policy'

describe('CRM policy', () => {
	it('fails closed for missing or unknown roles', () => {
		expect(canAccessCrm(undefined)).toBe(false)
		expect(canAccessCrm('UNKNOWN')).toBe(false)
		expect(canManageCrm(undefined)).toBe(false)
	})

	it('allows supported commercial and support roles to view CRM records', () => {
		expect(canAccessCrm(UserRole.ADMIN)).toBe(true)
		expect(canAccessCrm(UserRole.AGENTE)).toBe(true)
		expect(canAccessCrm(UserRole.ANALISTA_SOPORTE)).toBe(true)
		expect(canAccessCrm(UserRole.CONSULTOR)).toBe(true)
	})

	it('keeps read-only roles from mutating CRM records', () => {
		expect(canManageCrm(UserRole.CONSULTOR)).toBe(false)
		expect(canManageCrm(UserRole.DEFAULT)).toBe(false)
		expect(canManageCrm(UserRole.AGENTE)).toBe(true)
	})

	it('lets an admin or a leader of Money Strategies assign and relate leads', () => {
		expect(canLeadMoneyStrategies(UserRole.ADMIN, [], 1)).toBe(true)
		expect(canLeadMoneyStrategies(UserRole.AGENTE, [7, 8], 7)).toBe(true)
		expect(canLeadMoneyStrategies(UserRole.ANALISTA_SOPORTE, [4, 9], 4)).toBe(true)
	})

	it('hides assign and relate from an advisor who leads nobody', () => {
		expect(canLeadMoneyStrategies(UserRole.AGENTE, [7], 7)).toBe(false)
		expect(canLeadMoneyStrategies(UserRole.ANALISTA_SOPORTE, [4], 4)).toBe(false)
		expect(canLeadMoneyStrategies(UserRole.ANALISTA_SOPORTE, [], 4)).toBe(false)
	})
})
