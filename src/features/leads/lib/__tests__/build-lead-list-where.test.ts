import { describe, it, expect } from 'vitest'
import { buildLeadListWhere } from '@/features/leads/lib/build-lead-list-where'
import { UserRole } from '@/features/auth/lib/roles'

describe('buildLeadListWhere', () => {
	it('bypass role (ADMIN) sees all active leads — no idUser scoping', () => {
		const where = buildLeadListWhere(
			{ idUser: 1, role: { code: UserRole.ADMIN } },
			{},
			{ visibleUserIds: [1, 2, 3] }
		)

		expect(where).not.toHaveProperty('idUser')
		const andConditions = Array.isArray(where.AND) ? where.AND : [where]
		const hasIdUserClause = andConditions.some(
			(c) => c && typeof c === 'object' && 'idUser' in c
		)
		expect(hasIdUserClause).toBe(false)
	})

	it('CONSULTOR without a company-wide grant stays on the ids they were given', () => {
		const where = buildLeadListWhere(
			{ idUser: 9, role: { code: UserRole.CONSULTOR } },
			{},
			{ visibleUserIds: [9] }
		)

		const andConditions = Array.isArray(where.AND) ? where.AND : [where]
		expect(andConditions).toEqual(expect.arrayContaining([{ idUser: { in: [9] } }]))
	})

	it('an empty visible set is the granted company-wide read', () => {
		const where = buildLeadListWhere(
			{ idUser: 9, role: { code: UserRole.CONSULTOR } },
			{},
			{ visibleUserIds: [] }
		)

		const andConditions = Array.isArray(where.AND) ? where.AND : [where]
		const hasIdUserClause = andConditions.some(
			(c) => c && typeof c === 'object' && 'idUser' in c
		)
		expect(hasIdUserClause).toBe(false)
	})

	it('non-bypass role is scoped to visibleUserIds WITHOUT an `OR idUser: null` branch', () => {
		const where = buildLeadListWhere(
			{ idUser: 5, role: { code: UserRole.AGENTE } },
			{},
			{ visibleUserIds: [5, 6] }
		)

		const serialized = JSON.stringify(where)

		// Explicit assertion the owner-less OR branch is ABSENT for non-bypass
		// roles: a lead with idUser = null must never surface to a scoped user.
		expect(serialized).not.toContain('"idUser":null')
		expect(serialized).not.toMatch(/"OR":\s*\[[^\]]*"idUser":null/)

		const andConditions = Array.isArray(where.AND) ? where.AND : [where]
		const idUserClause = andConditions.find(
			(c) => c && typeof c === 'object' && 'idUser' in c
		) as { idUser?: { in?: number[] } } | undefined

		expect(idUserClause).toBeDefined()
		expect(idUserClause?.idUser).toEqual({ in: [5, 6] })
	})

	it('always scopes to active: true', () => {
		const where = buildLeadListWhere(
			{ idUser: 5, role: { code: UserRole.AGENTE } },
			{},
			{ visibleUserIds: [5] }
		)

		const andConditions = Array.isArray(where.AND) ? where.AND : [where]
		const hasActiveClause = andConditions.some(
			(c) => c && typeof c === 'object' && 'active' in c && c.active === true
		)
		expect(hasActiveClause).toBe(true)
	})

	describe('outcomeStatuses filter', () => {
		it('adds no filter clause when outcomeStatuses is empty', () => {
			const where = buildLeadListWhere(
				{ idUser: 1, role: { code: UserRole.ADMIN } },
				{ outcomeStatuses: [] }
			)
			const andConditions = Array.isArray(where.AND) ? where.AND : [where]
			const hasOutcomeClause = andConditions.some(
				(c) => c && typeof c === 'object' && 'outcomeStatus' in c
			)
			expect(hasOutcomeClause).toBe(false)
		})

		it('adds no filter clause when outcomeStatuses is undefined', () => {
			const where = buildLeadListWhere(
				{ idUser: 1, role: { code: UserRole.ADMIN } },
				{}
			)
			const andConditions = Array.isArray(where.AND) ? where.AND : [where]
			const hasOutcomeClause = andConditions.some(
				(c) => c && typeof c === 'object' && 'outcomeStatus' in c
			)
			expect(hasOutcomeClause).toBe(false)
		})

		it('adds an IN clause AND-combined with the hierarchy conditions when non-empty', () => {
			const where = buildLeadListWhere(
				{ idUser: 5, role: { code: UserRole.AGENTE } },
				{ outcomeStatuses: ['OPEN', 'WON'] },
				{ visibleUserIds: [5] }
			)
			const andConditions = Array.isArray(where.AND) ? where.AND : [where]
			const outcomeClause = andConditions.find(
				(c) => c && typeof c === 'object' && 'outcomeStatus' in c
			) as { outcomeStatus?: { in?: string[] } } | undefined

			expect(outcomeClause?.outcomeStatus).toEqual({ in: ['OPEN', 'WON'] })
			const idUserClause = andConditions.find(
				(c) => c && typeof c === 'object' && 'idUser' in c
			)
			expect(idUserClause).toBeDefined()
		})
	})

	describe('createdAtRange filter', () => {
		it('adds a createdAt gte/lte clause AND-combined into whereConditions', () => {
			const gte = new Date('2026-08-01T05:00:00.000Z')
			const lte = new Date('2026-08-31T23:59:59.999Z')
			const where = buildLeadListWhere(
				{ idUser: 1, role: { code: UserRole.ADMIN } },
				{ createdAtRange: { gte, lte } }
			)
			const andConditions = Array.isArray(where.AND) ? where.AND : [where]
			const createdAtClause = andConditions.find(
				(c) => c && typeof c === 'object' && 'createdAt' in c
			) as { createdAt?: { gte?: Date; lte?: Date } } | undefined

			expect(createdAtClause?.createdAt).toEqual({ gte, lte })
		})

		it('adds no createdAt clause when createdAtRange is absent', () => {
			const where = buildLeadListWhere(
				{ idUser: 1, role: { code: UserRole.ADMIN } },
				{}
			)
			const andConditions = Array.isArray(where.AND) ? where.AND : [where]
			const hasCreatedAtClause = andConditions.some(
				(c) => c && typeof c === 'object' && 'createdAt' in c
			)
			expect(hasCreatedAtClause).toBe(false)
		})
	})

	it('drops an excluded branch without replacing the server scope', () => {
		const where = buildLeadListWhere(
			{ idUser: 5, role: { code: UserRole.AGENTE } },
			{ excludedOwnerIds: [6] },
			{ visibleUserIds: [5, 6, 7] }
		)
		const andConditions = Array.isArray(where.AND) ? where.AND : [where]
		expect(andConditions).toContainEqual({ idUser: { in: [5, 6, 7] } })
		expect(andConditions).toContainEqual({ idUser: { notIn: [6] } })
	})

	it('filters by active client-origin links when origin ids are selected', () => {
		const where = buildLeadListWhere(
			{ idUser: 1, role: { code: UserRole.ADMIN } },
			{ originIds: [4, 5] }
		)
		const andConditions = Array.isArray(where.AND) ? where.AND : [where]
		expect(andConditions).toContainEqual({
			leadClientOrigins: {
				some: {
					idClientOrigin: { in: [4, 5] },
					active: true,
					clientOrigin: { status: true },
				},
			},
		})
	})

	it('adds no origin clause when originIds is empty', () => {
		const where = buildLeadListWhere(
			{ idUser: 1, role: { code: UserRole.ADMIN } },
			{ originIds: [] }
		)
		const serialized = JSON.stringify(where)
		expect(serialized).not.toContain('leadClientOrigins')
	})

	it('adds an owner clause that cannot widen a scoped hierarchy', () => {
		const where = buildLeadListWhere(
			{ idUser: 5, role: { code: UserRole.AGENTE } },
			{ ownerIds: [6, 99] },
			{ visibleUserIds: [5, 6] }
		)
		const andConditions = Array.isArray(where.AND) ? where.AND : [where]
		const ownerClauses = andConditions.filter(
			(clause) => clause && typeof clause === 'object' && 'idUser' in clause
		)
		expect(ownerClauses).toEqual([{ idUser: { in: [5, 6] } }, { idUser: { in: [6, 99] } }])
	})
})
