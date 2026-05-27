import { describe, it, expect, vi, beforeEach } from 'vitest'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { buildHierarchyTree } from '@/features/production-dashboard/services/hierarchy-tree.service'
import type { HierarchyNode } from '@/features/production-dashboard/types/hierarchy.types'
import type { SessionUser } from '@/features/shared/types/session-user.types'

vi.mock('@/features/shared/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))

vi.mock('@/features/production-dashboard/services/hierarchy-tree.service', () => ({
	buildHierarchyTree: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
	prisma: {},
}))

import { GET } from '@/app/api/production-dashboard/hierarchy-tree/route'

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const msJuniorViewer: SessionUser = {
	idUser: 10,
	name: 'Junior',
	lastName: 'User',
	email: 'junior@test.com',
	active: true,
	idLevel: 4,
	idCategory: null,
	idUserLeader: 3,
	role: { code: 'DEFAULT' },
	level: { code: 'LEVEL_0' },
}

const miaViewer: SessionUser = {
	idUser: 1,
	name: 'MIA',
	lastName: 'User',
	email: 'mia@test.com',
	active: true,
	idLevel: 1,
	idCategory: null,
	idUserLeader: null,
	role: { code: 'DEFAULT' },
	level: { code: 'GENERAL_LEVEL' },
}

const mockNodes: HierarchyNode[] = [
	{
		userId: 1,
		fullName: 'MIA User',
		levelCode: 'GENERAL_LEVEL',
		levelColor: '#111111',
		categoryName: 'Categoría A',
		included: true,
		children: [
			{
				userId: 2,
				fullName: 'Team Leader',
				levelCode: 'TEAM_LEADER',
				levelColor: '#222222',
				categoryName: 'Categoría B',
				included: true,
				children: [],
			},
		],
	},
]

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('GET /api/production-dashboard/hierarchy-tree', () => {
	const mockAuth = vi.mocked(auth)
	const mockGetCurrentUserByEmail = vi.mocked(getCurrentUserByEmail)
	const mockBuildHierarchyTree = vi.mocked(buildHierarchyTree)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('(a) returns 401 when no session exists', async () => {
		mockAuth.mockResolvedValue(null)

		const response = await GET()
		const body = await response.json()

		expect(response.status).toBe(401)
		expect(body).toEqual({ data: null, error: 'No autorizado' })
	})

	it('(b) returns 200 with empty nodes array for MS Junior viewer (level.code LEVEL_0)', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'junior@test.com' },
			expires: '2099-01-01',
		} as unknown as Awaited<ReturnType<typeof auth>>)
		mockGetCurrentUserByEmail.mockResolvedValue(msJuniorViewer)

		const response = await GET()
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body).toEqual({ data: { nodes: [] } })
	})

	it('(c) returns 200 with non-empty nodes for MIA viewer (GENERAL_LEVEL)', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'mia@test.com' },
			expires: '2099-01-01',
		} as unknown as Awaited<ReturnType<typeof auth>>)
		mockGetCurrentUserByEmail.mockResolvedValue(miaViewer)
		mockBuildHierarchyTree.mockResolvedValue(mockNodes)

		const response = await GET()
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body.data.nodes).toHaveLength(1)
		expect(body.data.nodes[0].userId).toBe(1)
		expect(body.data.nodes[0].children).toHaveLength(1)
	})

	it('(d) returns 404 when valid session email is not found in DB', async () => {
		mockAuth.mockResolvedValue({
			user: { email: 'unknown@test.com' },
			expires: '2099-01-01',
		} as unknown as Awaited<ReturnType<typeof auth>>)
		mockGetCurrentUserByEmail.mockResolvedValue(null)

		const response = await GET()
		const body = await response.json()

		expect(response.status).toBe(404)
		expect(body.data).toBeNull()
	})
})
