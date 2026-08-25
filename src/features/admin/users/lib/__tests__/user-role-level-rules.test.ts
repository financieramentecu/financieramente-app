import { describe, it, expect } from 'vitest'
import { validateRoleLevelPair } from '../user-role-level-rules'
import { UserRole } from '@/features/auth/lib/roles'

describe('validateRoleLevelPair', () => {
	it('rejects CONSULTOR with a non-null levelId', () => {
		const result = validateRoleLevelPair({
			roleCode: UserRole.CONSULTOR,
			levelId: 3,
		})
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(result.error).toBe(
				'Un usuario con rol de solo lectura no puede tener un nivel jerárquico asignado'
			)
		}
	})

	it('accepts CONSULTOR with a null levelId', () => {
		const result = validateRoleLevelPair({
			roleCode: UserRole.CONSULTOR,
			levelId: null,
		})
		expect(result.ok).toBe(true)
	})

	it('accepts CONSULTOR with an undefined levelId', () => {
		const result = validateRoleLevelPair({
			roleCode: UserRole.CONSULTOR,
			levelId: undefined,
		})
		expect(result.ok).toBe(true)
	})

	it('accepts a write-capable role (AGENTE) with a levelId', () => {
		const result = validateRoleLevelPair({
			roleCode: UserRole.AGENTE,
			levelId: 3,
		})
		expect(result.ok).toBe(true)
	})

	it('accepts a write-capable role (ADMIN) with a null levelId', () => {
		const result = validateRoleLevelPair({
			roleCode: UserRole.ADMIN,
			levelId: null,
		})
		expect(result.ok).toBe(true)
	})
})
