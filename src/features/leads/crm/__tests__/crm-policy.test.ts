import { describe, expect, it } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { canAccessCrm, canManageCrm } from '@/features/leads/crm/crm-policy'

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
})
