import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '../route'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getLeadDetail } from '@/features/leads/services/lead-board.service'
import { canAccessCrm, canManageCrm } from '@/features/leads/crm/crm-policy'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { appendLeadActivityTx } from '@/features/leads/activities/lead-activity.service'
import { getLeadTimelinePage } from '@/features/leads/activities/lead-timeline.service'

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
}))
vi.mock('@/features/leads/activities/lead-timeline.service', () => ({
	getLeadTimelinePage: vi.fn(),
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
		expect(getLeadTimelinePage).not.toHaveBeenCalled()
	})

	it('returns a scoped activity page for an authorized viewer', async () => {
		vi.mocked(getLeadTimelinePage).mockResolvedValue({
			items: [],
			nextCursor: null,
		})
		const response = await GET(request(), context('1'))
		expect(response.status).toBe(200)
		expect(getLeadTimelinePage).toHaveBeenCalled()
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

	it('passes a decoded timeline cursor and rejects a malformed one', async () => {
		vi.mocked(getLeadTimelinePage).mockResolvedValue({ items: [], nextCursor: null })
		const ok = await GET(new Request('http://x/?cursor=2026-11-09T10:00:00.000Z|stage_change|3'), context('1'))
		expect(ok.status).toBe(200)
		expect(getLeadTimelinePage).toHaveBeenCalledWith(1, {
			limit: 25,
			cursor: { occurredAt: new Date('2026-11-09T10:00:00.000Z'), kind: 'stage_change', id: 3 },
		})
		const bad = await GET(new Request('http://x/?cursor=nope'), context('1'))
		expect(bad.status).toBe(400)
	})

	it('accepts a logged call and stores its occurredAt', async () => {
		vi.mocked(appendLeadActivityTx).mockResolvedValue({ idLeadActivity: 10 } as never)
		const occurredAt = '2026-11-08T15:00:00.000Z'
		const response = await POST(
			request({ type: 'CALL_LOGGED', payload: { summary: 'Interesada', outcome: 'CONNECTED', occurredAt } }),
			context('1')
		)
		expect(response.status).toBe(201)
		expect(appendLeadActivityTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ type: 'CALL_LOGGED', occurredAt: new Date(occurredAt) })
		)
	})

	it('forbids read-only roles from logging activities', async () => {
		vi.mocked(canManageCrm).mockReturnValue(false)
		const response = await POST(request({ type: 'NOTE_ADDED', payload: { note: 'x' } }), context('1'))
		expect(response.status).toBe(403)
	})
})
