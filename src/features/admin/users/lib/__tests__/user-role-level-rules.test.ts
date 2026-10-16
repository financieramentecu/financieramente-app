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

describe('validateRoleLevelPair — partner pairing (PM-07, ADM-01)', () => {
	it('accepts the canonical partner pair (PARTNER + PARTNER_EXTERNAL)', () => {
		expect(
			validateRoleLevelPair({
				roleCode: UserRole.PARTNER,
				levelId: 91,
				levelCode: 'PARTNER_EXTERNAL',
			})
		).toEqual({ ok: true })
	})

	it.each(['LEVEL_1', 'LEVEL_3', 'GENERAL_LEVEL', null, undefined])(
		'rejects assigning role PARTNER with level %s (non-partner level)',
		(levelCode) => {
			const result = validateRoleLevelPair({
				roleCode: UserRole.PARTNER,
				levelId: 3,
				levelCode,
			})
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toBe(
					'El rol Partner solo se asigna desde el módulo Partners'
				)
			}
		}
	)

	it.each([
		UserRole.AGENTE,
		UserRole.ADMIN,
		UserRole.ASISTENTE_GERENCIA_OPERATIVA,
		null,
	])(
		'rejects level PARTNER_EXTERNAL for non-partner role %s (other direction)',
		(roleCode) => {
			const result = validateRoleLevelPair({
				roleCode,
				levelId: 91,
				levelCode: 'PARTNER_EXTERNAL',
			})
			expect(result.ok).toBe(false)
			if (!result.ok) {
				expect(result.error).toBe(
					'El nivel Partner Externo solo se asigna desde el módulo Partners'
				)
			}
		}
	)

	it('keeps accepting ordinary pairs when levelCode is provided', () => {
		expect(
			validateRoleLevelPair({
				roleCode: UserRole.AGENTE,
				levelId: 3,
				levelCode: 'LEVEL_3',
			})
		).toEqual({ ok: true })
	})
})
