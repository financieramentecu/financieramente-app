import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE, GET } from '../route'
import { requirePermission } from '@/features/access-control/services/require-permission'
import { deleteLead } from '@/features/leads/services/lead-admin.service'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getLeadDetail } from '@/features/leads/services/lead-board.service'

vi.mock('@/features/access-control/services/require-permission', () => ({
	requirePermission: vi.fn(),
}))

vi.mock('@/features/leads/services/lead-admin.service', () => ({
	deleteLead: vi.fn(),
}))

vi.mock('@/auth', () => ({
	auth: vi.fn(),
}))

vi.mock('@/features/shared/lib/flagsmith-server', () => ({
	isFeatureEnabledServer: vi.fn().mockResolvedValue(true),
}))
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))

vi.mock('@/features/auth/lib/hierarchy', () => ({
	getAccessibleUserIds: vi.fn(() => Promise.resolve([5, 6])),
	isHierarchyBypassRole: vi.fn((role: string) => role === 'ADMIN' || role === 'CONSULTOR'),
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

describe('DELETE /api/leads/[id]', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when unauthenticated', async () => {
		vi.mocked(requirePermission).mockResolvedValue({
			ok: false,
			response: { status: 401, json: () => Promise.resolve({ success: false, error: 'No autorizado' }) },
		} as never)

		const response = await DELETE(new Request('http://x'), buildContext('1'))

		expect(response.status).toBe(401)
		expect(deleteLead).not.toHaveBeenCalled()
	})

	it('returns 403 for a non-admin (role gate runs before lookup)', async () => {
		vi.mocked(requirePermission).mockResolvedValue({
			ok: false,
			response: { status: 403, json: () => Promise.resolve({ success: false, error: 'Sin permisos' }) },
		} as never)

		const response = await DELETE(new Request('http://x'), buildContext('1'))

		expect(response.status).toBe(403)
		expect(deleteLead).not.toHaveBeenCalled()
	})

	it('returns 400 on a NaN id', async () => {
		vi.mocked(requirePermission).mockResolvedValue({
			ok: true,
			session: { user: { id: '1', email: 'admin@x.com' } },
		} as never)

		const response = await DELETE(new Request('http://x'), buildContext('not-a-number'))

		expect(response.status).toBe(400)
		expect(deleteLead).not.toHaveBeenCalled()
	})

	it('returns 404 when the lead does not exist', async () => {
		vi.mocked(requirePermission).mockResolvedValue({
			ok: true,
			session: { user: { id: '1', email: 'admin@x.com' } },
		} as never)
		vi.mocked(deleteLead).mockResolvedValue({
			data: null,
			error: 'Lead no encontrado',
			notFound: true,
		})

		const response = await DELETE(new Request('http://x'), buildContext('999'))

		expect(response.status).toBe(404)
	})

	it('returns 409 when the lead is ineligible', async () => {
		vi.mocked(requirePermission).mockResolvedValue({
			ok: true,
			session: { user: { id: '1', email: 'admin@x.com' } },
		} as never)
		vi.mocked(deleteLead).mockResolvedValue({
			data: null,
			error: 'Este lead no se puede eliminar',
		})

		const response = await DELETE(new Request('http://x'), buildContext('1'))

		expect(response.status).toBe(409)
	})

	it('returns 200 with idLead on success', async () => {
		vi.mocked(requirePermission).mockResolvedValue({
			ok: true,
			session: { user: { id: '1', email: 'admin@x.com' } },
		} as never)
		vi.mocked(deleteLead).mockResolvedValue({ data: { idLead: 1 } })

		const response = await DELETE(new Request('http://x'), buildContext('1'))
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body.data).toEqual({ idLead: 1 })
	})
})

describe('GET /api/leads/[id] — remains unaffected by the DELETE addition', () => {
	beforeEach(() => vi.clearAllMocks())

	it('returns 401 when unauthenticated', async () => {
		vi.mocked(auth).mockResolvedValue(null as never)

		const response = await GET(new Request('http://x'), buildContext('1'))

		expect(response.status).toBe(401)
	})

	it('returns 200 with lead detail when found', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { email: 'a@x.com' } } as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 1,
			role: { code: 'ADMIN' },
		} as never)
		vi.mocked(getLeadDetail).mockResolvedValue({ idLead: 1 } as never)

		const response = await GET(new Request('http://x'), buildContext('1'))
		const body = await response.json()

		expect(response.status).toBe(200)
		expect(body.data).toEqual({ idLead: 1 })
	})
})


describe('GET /api/leads/[id] CRM read grants', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(auth).mockResolvedValue({ user: { email: 'a@x.com' } } as never)
		vi.mocked(getLeadDetail).mockResolvedValue({ idLead: 42 } as never)
	})

	it('rejects a CONSULTOR without the grant before querying the lead', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({ idUser: 5, role: { code: 'CONSULTOR' }, canViewOthersCrm: false } as never)
		const response = await GET(new Request('http://x'), buildContext('42'))
		expect(response.status).toBe(403)
		expect(getLeadDetail).not.toHaveBeenCalled()
	})

	it('uses company-wide scope for an AGENTE with the grant when opening another branch lead', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({ idUser: 5, role: { code: 'AGENTE' }, canViewOthersCrm: true } as never)
		const response = await GET(new Request('http://x'), buildContext('42'))
		expect(response.status).toBe(200)
		expect(getLeadDetail).toHaveBeenCalledWith(42, expect.anything(), { visibleUserIds: [] })
	})
})
