import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PATCH } from '../route'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { isLeadVisible } from '@/features/leads/services/lead-board.service'
import { assignLeadOwner } from '@/features/leads/services/assign-lead-owner.service'
import { getAccessibleUserIds } from '@/features/auth/lib/hierarchy'

vi.mock('@/auth', () => ({
	auth: vi.fn(async () => ({ user: { email: 'actor@example.com' } })),
}))
vi.mock('@/features/shared/lib/flagsmith-server', () => ({
	isFeatureEnabledServer: vi.fn(async () => true),
}))
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/features/auth/lib/hierarchy', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/features/auth/lib/hierarchy')>()),
	getAccessibleUserIds: vi.fn(async () => [7]),
}))
vi.mock('@/features/leads/services/lead-board.service', () => ({
	isLeadVisible: vi.fn(),
}))
vi.mock('@/features/leads/services/assign-lead-owner.service', () => ({
	assignLeadOwner: vi.fn(),
}))

function assignRequest(idUser: number) {
	return new Request('http://localhost/api/leads/12/owner', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ idUser }),
	})
}

describe('PATCH /api/leads/[id]/owner', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(isLeadVisible).mockResolvedValue(true)
		vi.mocked(getAccessibleUserIds).mockResolvedValue([7, 9])
		vi.mocked(assignLeadOwner).mockResolvedValue({
			ok: true,
			idUser: 7,
			ownerName: 'Ana',
			assignedLeadIds: [12],
		})
	})

	it('rejects a read-only CONSULTOR', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 7,
			role: { code: 'CONSULTOR' },
		} as never)
		const response = await PATCH(assignRequest(7), {
			params: Promise.resolve({ id: '12' }),
		})
		expect(response.status).toBe(403)
		expect(assignLeadOwner).not.toHaveBeenCalled()
	})

	it('assigns an advisor inside the actor scope', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 7,
			role: { code: 'AGENTE' },
		} as never)
		const response = await PATCH(assignRequest(7), {
			params: Promise.resolve({ id: '12' }),
		})
		expect(response.status).toBe(200)
		expect(assignLeadOwner).toHaveBeenCalledWith(
			12,
			7,
			expect.objectContaining({ userId: 7 })
		)
	})

	it('rejects an advisor who does not lead anyone', async () => {
		vi.mocked(getAccessibleUserIds).mockResolvedValue([7])
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 7,
			role: { code: 'AGENTE' },
		} as never)
		const response = await PATCH(assignRequest(7), {
			params: Promise.resolve({ id: '12' }),
		})
		expect(response.status).toBe(403)
		expect(assignLeadOwner).not.toHaveBeenCalled()
	})

	it('rejects an advisor outside the actor scope', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 7,
			role: { code: 'AGENTE' },
		} as never)
		const response = await PATCH(assignRequest(99), {
			params: Promise.resolve({ id: '12' }),
		})
		expect(response.status).toBe(403)
		expect(assignLeadOwner).not.toHaveBeenCalled()
	})
})
