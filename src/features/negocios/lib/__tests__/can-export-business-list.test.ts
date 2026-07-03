import { describe, it, expect } from 'vitest'
import { canExportBusinessList } from '@/features/negocios/lib/can-export-business-list'
import { UserRole } from '@/features/auth/lib/roles'

describe('canExportBusinessList', () => {
	it('returns true for ADMIN role regardless of level', () => {
		expect(
			canExportBusinessList({ roleCode: UserRole.ADMIN, levelCode: undefined })
		).toBe(true)
	})

	it('returns true for ASISTENTE_GERENCIA_OPERATIVA role', () => {
		expect(
			canExportBusinessList({
				roleCode: UserRole.ASISTENTE_GERENCIA_OPERATIVA,
				levelCode: undefined,
			})
		).toBe(true)
	})

	it('returns true for ANALISTA_SOPORTE role', () => {
		expect(
			canExportBusinessList({
				roleCode: UserRole.ANALISTA_SOPORTE,
				levelCode: undefined,
			})
		).toBe(true)
	})

	it.each(['LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5', 'GENERAL_LEVEL'])(
		'returns true for level code %s without admin-like role',
		(levelCode) => {
			expect(
				canExportBusinessList({ roleCode: UserRole.AGENTE, levelCode })
			).toBe(true)
		}
	)

	it('returns false for LEVEL_0 without admin-like role', () => {
		expect(
			canExportBusinessList({ roleCode: UserRole.AGENTE, levelCode: 'LEVEL_0' })
		).toBe(false)
	})

	it('returns false for LEVEL_1 without admin-like role', () => {
		expect(
			canExportBusinessList({ roleCode: UserRole.AGENTE, levelCode: 'LEVEL_1' })
		).toBe(false)
	})

	it('returns false when both roleCode and levelCode are undefined', () => {
		expect(
			canExportBusinessList({ roleCode: undefined, levelCode: undefined })
		).toBe(false)
	})

	it('returns false for an unknown level code with non-admin role', () => {
		expect(
			canExportBusinessList({
				roleCode: UserRole.AGENTE,
				levelCode: 'SOME_UNKNOWN_CODE',
			})
		).toBe(false)
	})
})
