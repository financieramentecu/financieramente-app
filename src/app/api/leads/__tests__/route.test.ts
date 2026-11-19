import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getAccessibleUserIds } from '@/features/auth/lib/hierarchy'
import { getLeadBoard } from '@/features/leads/services/lead-board.service'

vi.mock('@/auth')
vi.mock('@/features/shared/lib/flagsmith-server', () => ({
	isFeatureEnabledServer: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/features/auth/lib/hierarchy', () => ({
	getAccessibleUserIds: vi.fn(),
	HIERARCHY_BYPASS_ROLES: ['ADMIN'],
	isHierarchyBypassRole: vi.fn((role: string) => role === 'ADMIN'),
}))
vi.mock('@/features/leads/services/lead-board.service', () => ({
	getLeadBoard: vi.fn(),
}))
vi.mock('@/features/leads/lib/lead-board-filters', () => ({
	getDefaultLeadBoardFilters: vi.fn(() => ({
		outcomeStatuses: ['OPEN'],
		createdAtRange: {
			gte: new Date('2026-08-01T05:00:00.000Z'),
			lte: new Date('2026-08-31T23:59:59.999Z'),
		},
	})),
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

function buildRequest(query = '') {
	return new Request(`http://localhost:3000/api/leads${query}`)
}

describe('GET /api/leads', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(auth).mockResolvedValue({
			user: { email: 'agent@example.com' },
		} as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 5,
			role: { code: 'AGENTE' },
		} as never)
		vi.mocked(getAccessibleUserIds).mockResolvedValue([5, 6])
		vi.mocked(getLeadBoard).mockResolvedValue([])
	})

	it('requires authentication', async () => {
		vi.mocked(auth).mockResolvedValue(null)

		const response = await GET(buildRequest())
		expect(response.status).toBe(401)
	})

	it('scopes the board by the viewer hierarchy', async () => {
		const response = await GET(buildRequest())

		expect(getLeadBoard).toHaveBeenCalledWith(
			expect.objectContaining({ idUser: 5 }),
			expect.objectContaining({ visibleUserIds: [5, 6] })
		)
		expect(response.status).toBe(200)
	})

	it('rejects a CONSULTOR without the explicit CRM read grant before querying leads', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({ idUser: 5, role: { code: 'CONSULTOR' }, canViewOthersCrm: false } as never)
		const response = await GET(buildRequest())
		expect(response.status).toBe(403)
		expect(getLeadBoard).not.toHaveBeenCalled()
	})

	it('uses company-wide read for an AGENTE with the explicit grant', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({ idUser: 5, role: { code: 'AGENTE' }, canViewOthersCrm: true } as never)
		const response = await GET(buildRequest())
		expect(response.status).toBe(200)
		expect(getLeadBoard).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ visibleUserIds: [] }))
	})

	it('applies getDefaultLeadBoardFilters() when no query params are present', async () => {
		await GET(buildRequest())

		expect(getLeadBoard).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				outcomeStatuses: ['OPEN'],
				createdAtRange: expect.objectContaining({
					gte: new Date('2026-08-01T05:00:00.000Z'),
					lte: new Date('2026-08-31T23:59:59.999Z'),
				}),
			})
		)
	})

	it('parses repeated outcomeStatus query params and createdFrom/createdTo', async () => {
		await GET(
			buildRequest(
				'?outcomeStatus=OPEN&outcomeStatus=WON&createdFrom=2026-06-01&createdTo=2026-06-30'
			)
		)

		expect(getLeadBoard).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				outcomeStatuses: ['OPEN', 'WON'],
				createdAtRange: expect.objectContaining({
					gte: expect.any(Date),
					lte: expect.any(Date),
				}),
			})
		)
	})
})
