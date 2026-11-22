import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import { requireCrmActor } from '@/lib/auth/require-crm-actor'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { buildHierarchyTree } from '@/features/production-dashboard/services/hierarchy-tree.service'
import { GET } from '../route'

vi.mock('@/lib/auth/require-crm-actor', () => ({ requireCrmActor: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/shared/services/user.service', () => ({ getCurrentUserByEmail: vi.fn() }))
vi.mock('@/features/production-dashboard/services/hierarchy-tree.service', () => ({
	buildHierarchyTree: vi.fn(),
}))

describe('GET /api/crm/hierarchy-tree', () => {
	beforeEach(() => vi.clearAllMocks())

	it.each([401, 403, 404])('returns the guard rejection %s without loading the tree', async (status) => {
		vi.mocked(requireCrmActor).mockResolvedValue({
			ok: false,
			response: NextResponse.json({ data: null, error: 'Denied' }, { status }),
		})
		const response = await GET()
		expect(response.status).toBe(status)
		expect(requireCrmActor).toHaveBeenCalledWith('leads_module')
		expect(getCurrentUserByEmail).not.toHaveBeenCalled()
		expect(buildHierarchyTree).not.toHaveBeenCalled()
	})

	it('returns the full tree for an authorized read grant', async () => {
		vi.mocked(requireCrmActor).mockResolvedValue({
			ok: true,
			actor: { email: 'reader@example.com' },
		} as never)
		const viewer = { idUser: 7, role: { code: 'CONSULTOR' }, canViewOthersCrm: true }
		vi.mocked(getCurrentUserByEmail).mockResolvedValue(viewer as never)
		vi.mocked(buildHierarchyTree).mockResolvedValue([])
		const response = await GET()
		expect(response.status).toBe(200)
		expect(getCurrentUserByEmail).toHaveBeenCalledWith('reader@example.com')
		expect(buildHierarchyTree).toHaveBeenCalledWith(viewer, {}, { fullTree: true })
	})
})
