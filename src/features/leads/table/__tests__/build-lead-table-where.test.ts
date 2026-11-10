import { describe, expect, it } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { buildLeadTableWhere } from '@/features/leads/table/build-lead-table-where'
import { DEFAULT_LEAD_TABLE_QUERY, type LeadTableQuery } from '@/features/leads/table/lead-table-query.schema'

const now = new Date('2026-11-10T15:00:00.000Z')
const asesor = { idUser: 5, role: { code: UserRole.AGENTE } }
const admin = { idUser: 1, role: { code: UserRole.ADMIN } }

function build(query: Partial<LeadTableQuery>, viewer = asesor, visibleUserIds = [5, 6]) {
	const where = buildLeadTableWhere(viewer, { ...DEFAULT_LEAD_TABLE_QUERY, ...query }, {
		visibleUserIds,
		now,
		inactivityDays: 7,
	})
	return where.AND as Record<string, unknown>[]
}

describe('buildLeadTableWhere', () => {
	it('keeps the hierarchy scope and active flag with no filters', () => {
		const and = build({})
		expect(and).toContainEqual({ active: true })
		expect(and).toContainEqual({ idUser: { in: [5, 6] } })
		expect(and).toHaveLength(2)
	})

	it('matches every search token against the contact fields', () => {
		const and = build({ q: 'ana  perez' })
		const tokens = and.filter((clause) => 'OR' in clause)
		expect(tokens).toHaveLength(2)
		expect(tokens[0]).toEqual({
			OR: [
				{ name: { contains: 'ana', mode: 'insensitive' } },
				{ lastName: { contains: 'ana', mode: 'insensitive' } },
				{ email: { contains: 'ana', mode: 'insensitive' } },
				{ phone: { contains: 'ana', mode: 'insensitive' } },
				{ identityNumber: { contains: 'ana', mode: 'insensitive' } },
			],
		})
	})

	it('filters by status, stage, tag and Bogotá created range', () => {
		const and = build({ statuses: ['OPEN'], stageIds: [3, 4], tagIds: [2], from: '2026-11-01', to: '2026-11-30' })
		expect(and).toContainEqual({ outcomeStatus: { in: ['OPEN'] } })
		expect(and).toContainEqual({ idLeadFunnelColumn: { in: [3, 4] } })
		expect(and).toContainEqual({
			tagAssignments: { some: { idLeadTag: { in: [2] }, active: true, tag: { active: true } } },
		})
		expect(and).toContainEqual({
			createdAt: { gte: new Date('2026-11-01T05:00:00.000Z'), lte: new Date('2026-12-01T04:59:59.999Z') },
		})
	})

	it('never widens the scope through the owner filter', () => {
		expect(build({ ownerIds: [6, 99] })).toContainEqual({ idUser: { in: [6] } })
		expect(build({ ownerIds: [99] })).toContainEqual({ idUser: { in: [] } })
	})

	it('lets a bypass role filter by any owner', () => {
		const and = build({ ownerIds: [99] }, admin, [])
		expect(and).toContainEqual({ idUser: { in: [99] } })
		expect(and).not.toContainEqual({ idUser: { in: [] } })
	})

	it('keeps open leads idle for at least the threshold', () => {
		const cutoff = new Date('2026-11-03T15:00:00.000Z')
		expect(build({ idle: true })).toContainEqual({
			outcomeStatus: 'OPEN',
			OR: [{ lastActivityAt: { lte: cutoff } }, { lastActivityAt: null, createdAt: { lte: cutoff } }],
		})
	})
})
