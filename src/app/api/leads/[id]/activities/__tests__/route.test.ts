import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '../route'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getLeadDetail } from '@/features/leads/services/lead-board.service'
import { canAccessCrm, canManageCrm } from '@/features/leads/crm/crm-policy'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import {
	appendLeadActivityTx,
	getLeadActivityPage,
} from '@/features/leads/activities/lead-activity.service'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/features/negocios/services/user.service', () => ({
	getCurrentUserByEmail: vi.fn(),
}))
vi.mock('@/features/auth/lib/hierarchy', () => ({
	getAccessibleUserIds: vi.fn(() => Promise.resolve([])),
	isHierarchyBypassRole: vi.fn(() => true),
}))
vi.mock('@/features/leads/services/lead-board.service', () => ({
	getLeadDetail: vi.fn(),
}))
vi.mock('@/features/leads/crm/crm-policy', () => ({
	canAccessCrm: vi.fn(),
	canManageCrm: vi.fn(),
}))
vi.mock('@/features/shared/lib/flagsmith-server', () => ({
	isFeatureEnabledServer: vi.fn(),
}))
vi.mock('@/features/leads/activities/lead-activity.service', () => ({
	appendLeadActivityTx: vi.fn(),
	getLeadActivityPage: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({
	prisma: { $transaction: vi.fn((callback) => callback({})) },
}))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			status: init?.status ?? 200,
			json: () => Promise.resolve(data),
		})),
	},
}))

const context = (id: string) => ({ params: Promise.resolve({ id }) })
const request = (body?: unknown) =>
	new Request('http://x', {
		method: body ? 'POST' : 'GET',
		headers: body ? { 'content-type': 'application/json' } : undefined,
		body: body ? JSON.stringify(body) : undefined,
	})

describe('/api/leads/[id]/activities', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(auth).mockResolvedValue({
			user: { email: 'agent@example.com' },
		} as never)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 7,
			role: { code: 'AGENTE' },
		} as never)
		vi.mocked(isFeatureEnabledServer).mockResolvedValue(true)
		vi.mocked(canAccessCrm).mockReturnValue(true)
		vi.mocked(canManageCrm).mockReturnValue(true)
		vi.mocked(getLeadDetail).mockResolvedValue({ idLead: 1 } as never)
	})

	it('returns 404 while crm_timeline is disabled', async () => {
		vi.mocked(isFeatureEnabledServer).mockResolvedValue(false)
		const response = await GET(request(), context('1'))
		expect(response.status).toBe(404)
		expect(getLeadActivityPage).not.toHaveBeenCalled()
	})

	it('returns a scoped activity page for an authorized viewer', async () => {
		vi.mocked(getLeadActivityPage).mockResolvedValue({
			items: [],
			nextCursor: null,
		})
		const response = await GET(request(), context('1'))
		expect(response.status).toBe(200)
		expect(getLeadActivityPage).toHaveBeenCalled()
	})

	it('accepts only a typed note mutation and appends it in a transaction', async () => {
		vi.mocked(appendLeadActivityTx).mockResolvedValue({
			idLeadActivity: 9,
		} as never)
		const response = await POST(
			request({ type: 'NOTE_ADDED', payload: { note: 'Llamar mañana' } }),
			context('1')
		)
		expect(response.status).toBe(201)
		expect(appendLeadActivityTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				idLead: 1,
				idUser: 7,
				type: 'NOTE_ADDED',
				payload: { note: 'Llamar mañana' },
			})
		)
	})

	it('rejects client supplied lifecycle event types', async () => {
		const response = await POST(
			request({ type: 'CONVERTED', payload: { note: 'false event' } }),
			context('1')
		)
		expect(response.status).toBe(400)
		expect(appendLeadActivityTx).not.toHaveBeenCalled()
	})
})
