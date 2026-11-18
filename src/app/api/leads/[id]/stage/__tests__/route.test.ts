import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PATCH } from '../route'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { isLeadVisible } from '@/features/leads/services/lead-board.service'
import { moveLeadToStage } from '@/features/leads/services/move-lead-stage.service'

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
vi.mock('@/features/leads/services/move-lead-stage.service', () => ({
	moveLeadToStage: vi.fn(),
}))

function moveRequest() {
	return new Request('http://localhost/api/leads/12/stage', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ idLeadFunnelColumn: 2 }),
	})
}

describe('PATCH /api/leads/[id]/stage authorization', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(isLeadVisible).mockResolvedValue(true)
		vi.mocked(moveLeadToStage).mockResolvedValue({ ok: true })
	})

	it('rejects a read-only CONSULTOR through the real CRM guard', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 7,
			role: { code: 'CONSULTOR' },
		} as never)
		const response = await PATCH(moveRequest(), {
			params: Promise.resolve({ id: '12' }),
		})
		expect(response.status).toBe(403)
		expect(await response.json()).toEqual({
			data: null,
			error: 'Sin permisos para modificar CRM',
		})
		expect(isLeadVisible).not.toHaveBeenCalled()
		expect(moveLeadToStage).not.toHaveBeenCalled()
	})

	it('allows an actor with management rights to move a scoped lead', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 7,
			role: { code: 'AGENTE' },
		} as never)
		const response = await PATCH(moveRequest(), {
			params: Promise.resolve({ id: '12' }),
		})
		expect(response.status).toBe(200)
		expect(moveLeadToStage).toHaveBeenCalledWith(
			12,
			2,
			expect.objectContaining({ userId: 7 })
		)
	})
})
