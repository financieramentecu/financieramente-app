import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '../route'
import { DELETE } from '../[id]/route'
import { PUT } from '@/app/api/leads/[id]/tags/route'
import { findScopedLead, requireCrmActor } from '@/lib/auth/require-crm-actor'
import { createLeadTag, deactivateLeadTag, listLeadTags, setLeadTags } from '@/features/leads/tags/lead-tag.service'

vi.mock('@/lib/auth/require-crm-actor', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/auth/require-crm-actor')>()),
	requireCrmActor: vi.fn(),
	findScopedLead: vi.fn(),
}))
vi.mock('@/features/leads/tags/lead-tag.service', () => ({
	listLeadTags: vi.fn(),
	createLeadTag: vi.fn(),
	deactivateLeadTag: vi.fn(),
	setLeadTags: vi.fn(),
}))

const actor = { idUser: 7, email: 'a@x.co', roleCode: 'AGENTE', visibleUserIds: [7], canManage: true }
const json = (method: string, body: unknown) =>
	new Request('http://x', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })

describe('/api/crm/tags', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: true, actor })
	})

	it('lists the catalogue for any CRM user', async () => {
		vi.mocked(listLeadTags).mockResolvedValue([])
		expect((await GET()).status).toBe(200)
		expect(requireCrmActor).toHaveBeenCalledWith('crm_lead_fields')
	})

	it('creates tags only with management rights', async () => {
		vi.mocked(createLeadTag).mockResolvedValue({ ok: true, tag: { idLeadTag: 1, name: 'VIP', color: '#64748b' } })
		expect((await POST(json('POST', { name: 'VIP' }))).status).toBe(201)
		expect(requireCrmActor).toHaveBeenCalledWith('crm_lead_fields', { manage: true })
		expect(createLeadTag).toHaveBeenCalledWith({ name: 'VIP', color: '#64748b' }, expect.objectContaining({ userId: 7 }))
	})

	it('maps validation and duplicates', async () => {
		expect((await POST(json('POST', { name: 'x', color: 'red' }))).status).toBe(400)
		vi.mocked(createLeadTag).mockResolvedValue({ ok: false, reason: 'DUPLICATE' })
		expect((await POST(json('POST', { name: 'VIP' }))).status).toBe(409)
	})

	it('deactivates a tag', async () => {
		vi.mocked(deactivateLeadTag).mockResolvedValue({ ok: false, reason: 'NOT_FOUND' })
		expect((await DELETE(new Request('http://x'), ctx('1'))).status).toBe(404)
		vi.mocked(deactivateLeadTag).mockResolvedValue({ ok: true })
		expect((await DELETE(new Request('http://x'), ctx('1'))).status).toBe(200)
	})
})

describe('PUT /api/leads/[id]/tags', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: true, actor })
		vi.mocked(findScopedLead).mockResolvedValue({ idLead: 10 } as never)
	})

	it('replaces the tags of a lead in scope', async () => {
		vi.mocked(setLeadTags).mockResolvedValue({ ok: true, tags: [] })
		expect((await PUT(json('PUT', { tagIds: [1, 2] }), ctx('10'))).status).toBe(200)
		expect(requireCrmActor).toHaveBeenCalledWith('crm_lead_fields', { manage: true })
		expect(setLeadTags).toHaveBeenCalledWith(10, [1, 2], expect.objectContaining({ userId: 7 }))
	})

	it('404s outside the scope and 400s on bad input or unknown tags', async () => {
		vi.mocked(findScopedLead).mockResolvedValueOnce(null)
		expect((await PUT(json('PUT', { tagIds: [] }), ctx('10'))).status).toBe(404)
		expect((await PUT(json('PUT', { tagIds: ['a'] }), ctx('10'))).status).toBe(400)
		vi.mocked(setLeadTags).mockResolvedValue({ ok: false, reason: 'UNKNOWN_TAG' })
		expect((await PUT(json('PUT', { tagIds: [99] }), ctx('10'))).status).toBe(400)
	})
})
