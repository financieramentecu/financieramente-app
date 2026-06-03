import { describe, it, expect } from 'vitest'
import { buildBusinessListWhere } from '@/features/negocios/lib/build-business-list-where'
import { UserRole } from '@/features/auth/lib/roles'

const adminUser = { idUser: 1, role: { code: UserRole.ADMIN } }

describe('buildBusinessListWhere — new filter branches (Phase 2.4)', () => {
	describe('statuses[] filter', () => {
		it('applies status IN clause when statuses array provided', () => {
			const w = buildBusinessListWhere(adminUser, {
				statuses: ['EMITIDO', 'FONDEADO'],
			})
			expect(w).toEqual({
				AND: [{ status: { in: ['EMITIDO', 'FONDEADO'] } }],
			})
		})

		it('applies single status when statuses has one element', () => {
			const w = buildBusinessListWhere(adminUser, {
				statuses: ['EMITIDO'],
			})
			expect(w).toEqual({
				AND: [{ status: { in: ['EMITIDO'] } }],
			})
		})

		it('falls back to single status string when statuses is absent', () => {
			const w = buildBusinessListWhere(adminUser, { status: 'EMITIDO' })
			expect(w).toEqual({ AND: [{ status: 'EMITIDO' }] })
		})

		it('applies statuses when both status and statuses present (statuses takes precedence)', () => {
			const w = buildBusinessListWhere(adminUser, {
				status: 'EMITIDO',
				statuses: ['FONDEADO', 'LIQUIDADO'],
			})
			expect(w).toEqual({
				AND: [{ status: { in: ['FONDEADO', 'LIQUIDADO'] } }],
			})
		})
	})

	describe('dateIssuedRange filter', () => {
		it('includes not:null guard and gte/lte when dateIssuedRange provided', () => {
			const gte = new Date('2026-01-01T05:00:00.000Z')
			const lte = new Date('2026-01-31T04:59:59.999Z')
			const w = buildBusinessListWhere(adminUser, {
				dateIssuedRange: { gte, lte },
			})
			expect(w).toEqual({
				AND: [
					{
						AND: [
							{ dateIssued: { not: null } },
							{ dateIssued: { gte, lte } },
						],
					},
				],
			})
		})

		it('does not add dateIssued filter when dateIssuedRange is absent', () => {
			const w = buildBusinessListWhere(adminUser, {})
			expect(w).toEqual({})
		})
	})

	describe('hasSupports filter', () => {
		it('applies supports.some when hasSupports=true', () => {
			const w = buildBusinessListWhere(adminUser, { hasSupports: true })
			expect(w).toEqual({
				AND: [{ supports: { some: { status: true } } }],
			})
		})

		it('applies supports.none when hasSupports=false', () => {
			const w = buildBusinessListWhere(adminUser, { hasSupports: false })
			expect(w).toEqual({
				AND: [{ supports: { none: { status: true } } }],
			})
		})

		it('does not add supports filter when hasSupports is undefined', () => {
			const w = buildBusinessListWhere(adminUser, {})
			expect(w).toEqual({})
		})
	})

	describe('terms[] filter', () => {
		it('applies term IN clause when terms provided', () => {
			const w = buildBusinessListWhere(adminUser, { terms: [1, 2, 3] })
			expect(w).toEqual({
				AND: [{ term: { in: [1, 2, 3] } }],
			})
		})

		it('does not add term filter for empty array', () => {
			const w = buildBusinessListWhere(adminUser, { terms: [] })
			expect(w).toEqual({})
		})
	})

	describe('periodicityIds[] filter', () => {
		it('applies idBuyPeriodicity IN clause when periodicityIds provided', () => {
			const w = buildBusinessListWhere(adminUser, { periodicityIds: [10, 20] })
			expect(w).toEqual({
				AND: [{ idBuyPeriodicity: { in: [10, 20] } }],
			})
		})

		it('does not add periodicity filter for empty array', () => {
			const w = buildBusinessListWhere(adminUser, { periodicityIds: [] })
			expect(w).toEqual({})
		})
	})

	describe('agentCategoryIds filter', () => {
		it('applies user.idCategory.in when agentCategoryIds provided', () => {
			const w = buildBusinessListWhere(adminUser, { agentCategoryIds: [1, 2] })
			expect(w).toEqual({ AND: [{ user: { idCategory: { in: [1, 2] } } }] })
		})

		it('does not add agentCategoryIds filter for empty array', () => {
			const w = buildBusinessListWhere(adminUser, { agentCategoryIds: [] })
			expect(w).toEqual({})
		})
	})

	describe('agentIds filter', () => {
		it('applies idUser.in when agentIds provided', () => {
			const w = buildBusinessListWhere(adminUser, { agentIds: [5, 6] })
			expect(w).toEqual({ AND: [{ idUser: { in: [5, 6] } }] })
		})

		it('does not add agentIds filter for empty array', () => {
			const w = buildBusinessListWhere(adminUser, { agentIds: [] })
			expect(w).toEqual({})
		})
	})

	describe('combined filters', () => {
		it('combines statuses, dateIssuedRange, hasSupports, terms, and periodicityIds correctly', () => {
			const gte = new Date('2026-01-01T05:00:00.000Z')
			const lte = new Date('2026-01-31T04:59:59.999Z')
			const w = buildBusinessListWhere(adminUser, {
				statuses: ['EMITIDO'],
				dateIssuedRange: { gte, lte },
				hasSupports: true,
				terms: [1],
				periodicityIds: [5],
			})
			expect(w).toEqual({
				AND: [
					{ status: { in: ['EMITIDO'] } },
					{
						AND: [
							{ dateIssued: { not: null } },
							{ dateIssued: { gte, lte } },
						],
					},
					{ supports: { some: { status: true } } },
					{ term: { in: [1] } },
					{ idBuyPeriodicity: { in: [5] } },
				],
			})
		})
	})
})
