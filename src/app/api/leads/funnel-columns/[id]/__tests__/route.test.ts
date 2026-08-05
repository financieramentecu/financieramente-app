import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH, DELETE } from '../route'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import {
	updateLeadFunnelColumn,
	deleteLeadFunnelColumn,
} from '@/features/leads/services/lead-funnel-column.service'

vi.mock('@/auth')
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/features/leads/services/lead-funnel-column.service', () => ({
	updateLeadFunnelColumn: vi.fn(),
	deleteLeadFunnelColumn: vi.fn(),
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

describe('PATCH/DELETE /api/leads/funnel-columns/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(auth).mockResolvedValue({ user: { email: 'admin@x.com' } } as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 1,
			role: { code: 'ADMIN' },
		} as never)
	})

	it('DELETE returns 409 when the service reports active leads', async () => {
		vi.mocked(deleteLeadFunnelColumn).mockResolvedValue({
			data: null,
			error: 'No se puede eliminar: la columna tiene 3 lead(s) activo(s)',
		})

		const response = await DELETE(new Request('http://x'), buildContext('2'))
		expect(response.status).toBe(409)
	})

	it('DELETE returns 200 when deletion succeeds', async () => {
		vi.mocked(deleteLeadFunnelColumn).mockResolvedValue({
			data: { idLeadFunnelColumn: 3 },
		})

		const response = await DELETE(new Request('http://x'), buildContext('3'))
		expect(response.status).toBe(200)
	})

	it('PATCH updates the column', async () => {
		vi.mocked(updateLeadFunnelColumn).mockResolvedValue({
			data: { idLeadFunnelColumn: 5, name: 'Nuevo' } as never,
		})

		const response = await PATCH(
			new Request('http://x', { method: 'PATCH', body: JSON.stringify({ name: 'Nuevo' }) }),
			buildContext('5')
		)
		expect(response.status).toBe(200)
	})
})
