import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { listActiveAgents } from '@/features/shared/services/agent.service'

vi.mock('@/auth')
vi.mock('@/features/shared/services/user.service')
vi.mock('@/features/shared/services/agent.service')
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data: unknown, init?: { status?: number }) => ({
			json: () => Promise.resolve(data),
			status: init?.status ?? 200,
		})),
	},
}))

const mockAuth = vi.mocked(auth)
const mockGetCurrentUser = vi.mocked(getCurrentUserByEmail)
const mockListActiveAgents = vi.mocked(listActiveAgents)

const mockViewer = {
	idUser: 1,
	name: 'Admin',
	lastName: 'User',
	email: 'admin@test.com',
	active: true,
	idLevel: null,
	idCategory: null,
	idUserLeader: null,
	role: { code: 'ADMIN' },
	level: { code: 'LEVEL_3' },
}

describe('GET /api/agents', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when unauthenticated', async () => {
		mockAuth.mockResolvedValue(null as never)

		const response = await GET()
		const body = await response.json()

		expect(response.status).toBe(401)
		expect(body.data).toBeNull()
		expect(mockListActiveAgents).not.toHaveBeenCalled()
	})

	it('returns 401 when session has no email', async () => {
		mockAuth.mockResolvedValue({ user: {} } as never)

		const response = await GET()

		expect(response.status).toBe(401)
		expect(mockListActiveAgents).not.toHaveBeenCalled()
	})

	it('returns 404 when viewer not found in DB', async () => {
		mockAuth.mockResolvedValue({ user: { email: 'ghost@test.com' } } as never)
		mockGetCurrentUser.mockResolvedValue(null)

		const response = await GET()
		const body = await response.json()

		expect(response.status).toBe(404)
		expect(body.data).toBeNull()
	})

	it('returns agents and showFilter=true for ADMIN', async () => {
		mockAuth.mockResolvedValue({ user: { email: mockViewer.email } } as never)
		mockGetCurrentUser.mockResolvedValue(mockViewer)
		mockListActiveAgents.mockResolvedValue({
			agents: [{ id: 10, name: 'Ana', lastName: 'García' }],
			showFilter: true,
		})

		const response = await GET()
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body.data.showFilter).toBe(true)
		expect(body.data.agents).toHaveLength(1)
		expect(mockListActiveAgents).toHaveBeenCalledWith({
			idUser: mockViewer.idUser,
			roleCode: 'ADMIN',
			levelCode: 'LEVEL_3',
		})
	})

	it('returns showFilter=false for MS Junior (LEVEL_0)', async () => {
		const juniorViewer = { ...mockViewer, role: { code: 'AGENTE' }, level: { code: 'LEVEL_0' } }
		mockAuth.mockResolvedValue({ user: { email: juniorViewer.email } } as never)
		mockGetCurrentUser.mockResolvedValue(juniorViewer)
		mockListActiveAgents.mockResolvedValue({ agents: [], showFilter: false })

		const response = await GET()
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body.data.showFilter).toBe(false)
		expect(body.data.agents).toHaveLength(0)
	})

	it('returns 500 on unexpected service error', async () => {
		mockAuth.mockResolvedValue({ user: { email: mockViewer.email } } as never)
		mockGetCurrentUser.mockResolvedValue(mockViewer)
		mockListActiveAgents.mockRejectedValue(new Error('DB error'))

		const response = await GET()
		const body = await response.json()

		expect(response.status).toBe(500)
		expect(body.data).toBeNull()
	})
})
