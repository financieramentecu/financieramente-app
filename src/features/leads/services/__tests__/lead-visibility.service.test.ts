import { describe, it, expect, vi, beforeEach } from 'vitest'

const getAccessibleUserIds = vi.fn()
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/auth/lib/hierarchy', () => ({
	getAccessibleUserIds: (...a: unknown[]) => getAccessibleUserIds(...a),
}))

import { resolveLeadVisibility } from '../lead-visibility.service'

beforeEach(() => {
	getAccessibleUserIds.mockReset()
	getAccessibleUserIds.mockResolvedValue([7, 8, 9])
})

describe('resolveLeadVisibility (defaults)', () => {
	it.each([
	'ADMIN',
	'ASISTENTE_GERENCIA_OPERATIVA',
	'ANALISTA_SOPORTE',
	'CONSULTOR',
])(
		'%s sees every lead (unrestricted, no hierarchy lookup)',
		async (role) => {
			expect(await resolveLeadVisibility(role, 7)).toEqual({
				unrestricted: true,
				visibleUserIds: [],
			})
			expect(getAccessibleUserIds).not.toHaveBeenCalled()
		}
	)

	it('AGENTE sees self plus the hierarchy', async () => {
		expect(await resolveLeadVisibility('AGENTE', 7)).toEqual({
			unrestricted: false,
			visibleUserIds: [7, 8, 9],
		})
		expect(getAccessibleUserIds).toHaveBeenCalledWith(7)
	})

	it.each(['PARTNER', 'SIN_ROL', 'NOPE', undefined])(
		'%s sees no leads (fails closed)',
		async (role) => {
			expect(await resolveLeadVisibility(role, 7)).toEqual({
				unrestricted: false,
				visibleUserIds: [],
			})
		}
	)
})
