import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import { canSeeAllDistributions } from '../hierarchy'
import { UserRole } from '../roles'

describe.each([
	{ role: UserRole.ADMIN, expected: true },
	{ role: UserRole.ASISTENTE_GERENCIA_OPERATIVA, expected: true },
	{ role: UserRole.ANALISTA_SOPORTE, expected: true },
	{ role: UserRole.AGENTE, expected: false },
	{ role: UserRole.SIN_ROL, expected: false },
	{ role: UserRole.CONSULTOR, expected: true },
	{ role: UserRole.PARTNER, expected: false },
])('canSeeAllDistributions($role)', ({ role, expected }) => {
	it(`returns ${expected}`, async () => {
		expect(await canSeeAllDistributions(role)).toBe(expected)
	})
})

describe('canSeeAllDistributions edge cases', () => {
	it('fails closed for undefined, null and unknown roles', async () => {
		expect(await canSeeAllDistributions(undefined)).toBe(false)
		expect(await canSeeAllDistributions(null)).toBe(false)
		expect(await canSeeAllDistributions('SOMETHING_NEW')).toBe(false)
	})
})
