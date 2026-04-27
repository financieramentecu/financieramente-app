import { describe, it, expect } from 'vitest'
import { buildBusinessListWhere } from '@/features/negocios/lib/build-business-list-where'
import { UserRole } from '@/features/auth/lib/roles'

describe('buildBusinessListWhere', () => {
	it('restringe por idUser cuando el rol es AGENTE', () => {
		const w = buildBusinessListWhere(
			{ idUser: 42, role: { code: UserRole.AGENTE } },
			{}
		)
		expect(w).toEqual({ AND: [{ idUser: 42 }] })
	})

	it('excluye dateAnchored null cuando hay rango', () => {
		const gte = new Date('2026-01-01T05:00:00.000Z')
		const lte = new Date('2026-01-31T04:59:59.999Z')
		const w = buildBusinessListWhere(
			{ idUser: 1, role: { code: UserRole.ADMIN } },
			{ dateAnchoredRange: { gte, lte } }
		)
		expect(w).toEqual({
			AND: [
				{
					AND: [
						{ dateAnchored: { not: null } },
						{
							dateAnchored: {
								gte,
								lte,
							},
						},
					],
				},
			],
		})
	})

	it('acota por createdAt cuando hay createdAtRange', () => {
		const gte = new Date('2026-04-01T05:00:00.000Z')
		const lte = new Date('2026-04-30T04:59:59.999Z')
		const w = buildBusinessListWhere(
			{ idUser: 1, role: { code: UserRole.ADMIN } },
			{ createdAtRange: { gte, lte } }
		)
		expect(w).toEqual({
			AND: [
				{
					createdAt: {
						gte,
						lte,
					},
				},
			],
		})
	})

	it('combina idUser AGENTE con createdAtRange', () => {
		const gte = new Date('2026-04-01T05:00:00.000Z')
		const lte = new Date('2026-04-30T04:59:59.999Z')
		const w = buildBusinessListWhere(
			{ idUser: 99, role: { code: UserRole.AGENTE } },
			{ createdAtRange: { gte, lte } }
		)
		expect(w).toEqual({
			AND: [
				{ idUser: 99 },
				{
					createdAt: {
						gte,
						lte,
					},
				},
			],
		})
	})
})
