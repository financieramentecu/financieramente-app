import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
import { canExportBusinessList } from '@/features/negocios/lib/can-export-business-list'
import { UserRole } from '@/features/auth/lib/roles'

describe('canExportBusinessList', () => {
	it('returns true for ADMIN role regardless of level', async () => {
		expect(
			await canExportBusinessList({ roleCode: UserRole.ADMIN, levelCode: undefined })
		).toBe(true)
	})

	it('returns true for ASISTENTE_GERENCIA_OPERATIVA role', async () => {
		expect(
			await canExportBusinessList({
				roleCode: UserRole.ASISTENTE_GERENCIA_OPERATIVA,
				levelCode: undefined,
			})
		).toBe(true)
	})

	it('returns true for ANALISTA_SOPORTE role', async () => {
		expect(
			await canExportBusinessList({
				roleCode: UserRole.ANALISTA_SOPORTE,
				levelCode: undefined,
			})
		).toBe(true)
	})

	it.each(['LEVEL_2', 'LEVEL_3', 'LEVEL_4', 'LEVEL_5', 'GENERAL_LEVEL'])(
		'returns true for level code %s without admin-like role',
		async (levelCode) => {
			expect(
				await canExportBusinessList({ roleCode: UserRole.AGENTE, levelCode })
			).toBe(true)
		}
	)

	it('returns false for LEVEL_0 without admin-like role', async () => {
		expect(
			await canExportBusinessList({ roleCode: UserRole.AGENTE, levelCode: 'LEVEL_0' })
		).toBe(false)
	})

	it('returns false for LEVEL_1 without admin-like role', async () => {
		expect(
			await canExportBusinessList({ roleCode: UserRole.AGENTE, levelCode: 'LEVEL_1' })
		).toBe(false)
	})

	it('returns false when both roleCode and levelCode are undefined', async () => {
		expect(
			await canExportBusinessList({ roleCode: undefined, levelCode: undefined })
		).toBe(false)
	})

	it('returns false for an unknown level code with non-admin role', async () => {
		expect(
			await canExportBusinessList({
				roleCode: UserRole.AGENTE,
				levelCode: 'SOME_UNKNOWN_CODE',
			})
		).toBe(false)
	})

	it('returns true for CONSULTOR without any assigned level', async () => {
		expect(
			await canExportBusinessList({
				roleCode: UserRole.CONSULTOR,
				levelCode: undefined,
			})
		).toBe(true)
	})

	it('returns true for CONSULTOR even when a hierarchy level is assigned', async () => {
		expect(
			await canExportBusinessList({
				roleCode: UserRole.CONSULTOR,
				levelCode: 'LEVEL_3',
			})
		).toBe(true)
	})

	it.each([undefined, 'PARTNER_EXTERNAL', 'LEVEL_0'])(
		'allows PARTNER to export (own rows only, level %s)',
		async (levelCode) => {
			expect(
				await canExportBusinessList({ roleCode: UserRole.PARTNER, levelCode })
			).toBe(true)
		}
	)
})
