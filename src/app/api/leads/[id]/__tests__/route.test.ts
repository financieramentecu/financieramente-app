import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getAccessibleUserIds } from '@/features/auth/lib/hierarchy'
import { getLeadDetail } from '@/features/leads/services/lead-board.service'

vi.mock('@/auth')
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/features/auth/lib/hierarchy', () => ({
	getAccessibleUserIds: vi.fn(),
	HIERARCHY_BYPASS_ROLES: ['ADMIN'],
	isHierarchyBypassRole: vi.fn((role: string) => role === 'ADMIN'),
}))
vi.mock('@/features/leads/services/lead-board.service', () => ({
	getLeadDetail: vi.fn(),
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

function buildContext(id: string) {
	return { params: Promise.resolve({ id }) }
}

describe('GET /api/leads/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(auth).mockResolvedValue({
			user: { email: 'agent@example.com' },
		} as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 5,
			role: { code: 'AGENTE' },
		} as never)
		vi.mocked(getAccessibleUserIds).mockResolvedValue([5])
	})

	it('requires authentication', async () => {
		vi.mocked(auth).mockResolvedValue(null)

		const response = await GET(new Request('http://x'), buildContext('1'))
		expect(response.status).toBe(401)
	})

	it('returns 404 when the lead is outside the viewer scope', async () => {
		vi.mocked(getLeadDetail).mockResolvedValue(null)

		const response = await GET(new Request('http://x'), buildContext('999'))
		expect(response.status).toBe(404)
	})

	it('returns 200 with the lead detail when visible', async () => {
		vi.mocked(getLeadDetail).mockResolvedValue({ idLead: 1 } as never)

		const response = await GET(new Request('http://x'), buildContext('1'))
		expect(response.status).toBe(200)
	})
})
