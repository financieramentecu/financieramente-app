import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '../route'
import { DELETE, PATCH } from '../[id]/route'
import { requireCrmActor } from '@/lib/auth/require-crm-actor'
import {
	createLeadSavedView,
	deactivateLeadSavedView,
	listLeadSavedViews,
	updateLeadSavedView,
} from '@/features/leads/views/lead-saved-view.service'

vi.mock('@/lib/auth/require-crm-actor', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/auth/require-crm-actor')>()),
	requireCrmActor: vi.fn(),
}))
vi.mock('@/features/leads/views/lead-saved-view.service', () => ({
	listLeadSavedViews: vi.fn(),
	createLeadSavedView: vi.fn(),
	updateLeadSavedView: vi.fn(),
	deactivateLeadSavedView: vi.fn(),
	MAX_SAVED_VIEWS_PER_USER: 20,
}))

const actor = { idUser: 7, email: 'a@x.co', roleCode: 'CONSULTOR', visibleUserIds: [], canManage: false, idCategory: null }
const json = (method: string, body: unknown) =>
	new Request('http://x', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const view = { idLeadSavedView: 3, name: 'A', query: {} }

describe('/api/crm/views', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: true, actor })
	})

	it('lists the viewer views', async () => {
		vi.mocked(listLeadSavedViews).mockResolvedValue([])
		expect((await GET()).status).toBe(200)
		expect(listLeadSavedViews).toHaveBeenCalledWith(7)
		expect(requireCrmActor).toHaveBeenCalledWith('crm_lead_table')
	})

	it('lets a read-only role save a personal view', async () => {
		vi.mocked(createLeadSavedView).mockResolvedValue({ ok: true, view } as never)
		const response = await POST(json('POST', { name: 'A', query: { statuses: ['OPEN'] } }))
		expect(response.status).toBe(201)
		expect(createLeadSavedView).toHaveBeenCalledWith(
			{ name: 'A', query: expect.objectContaining({ statuses: ['OPEN'] }) },
			expect.objectContaining({ userId: 7 })
		)
	})

	it('validates the body and the limit', async () => {
		expect((await POST(json('POST', { name: '', query: {} }))).status).toBe(400)
		expect((await POST(json('POST', { name: 'A', query: { sort: 'x' } }))).status).toBe(400)
		vi.mocked(createLeadSavedView).mockResolvedValue({ ok: false, reason: 'LIMIT_REACHED' })
		expect((await POST(json('POST', { name: 'A', query: {} }))).status).toBe(409)
	})

	it('updates and deletes only own views', async () => {
		vi.mocked(updateLeadSavedView).mockResolvedValue({ ok: false, reason: 'NOT_FOUND' })
		expect((await PATCH(json('PATCH', { name: 'B' }), ctx('3'))).status).toBe(404)
		vi.mocked(updateLeadSavedView).mockResolvedValue({ ok: true, view } as never)
		expect((await PATCH(json('PATCH', { name: 'B' }), ctx('3'))).status).toBe(200)
		expect((await PATCH(json('PATCH', {}), ctx('3'))).status).toBe(400)
		expect((await PATCH(json('PATCH', { name: 'B' }), ctx('x'))).status).toBe(400)

		vi.mocked(deactivateLeadSavedView).mockResolvedValue({ ok: true })
		const deleted = await DELETE(new Request('http://x', { method: 'DELETE' }), ctx('3'))
		expect(deleted.status).toBe(200)
		await expect(deleted.json()).resolves.toEqual({ success: true })
	})
})
