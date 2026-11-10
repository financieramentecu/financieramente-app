import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '../route'
import { DELETE, PATCH } from '../[id]/route'
import { GET as GET_FIELDS, PATCH as PATCH_FIELDS } from '@/app/api/leads/[id]/crm-fields/route'
import { findScopedLead, requireCrmActor } from '@/lib/auth/require-crm-actor'
import {
	createLeadCustomField,
	deactivateLeadCustomField,
	listLeadCustomFields,
	updateLeadCustomField,
} from '@/features/leads/custom-fields/lead-custom-field.service'
import { getLeadCrmFields, updateLeadCrmFields } from '@/features/leads/custom-fields/lead-crm-fields.service'

vi.mock('@/lib/auth/require-crm-actor', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/auth/require-crm-actor')>()),
	requireCrmActor: vi.fn(),
	findScopedLead: vi.fn(),
}))
vi.mock('@/features/leads/custom-fields/lead-custom-field.service', () => ({
	listLeadCustomFields: vi.fn(),
	createLeadCustomField: vi.fn(),
	updateLeadCustomField: vi.fn(),
	deactivateLeadCustomField: vi.fn(),
}))
vi.mock('@/features/leads/custom-fields/lead-crm-fields.service', () => ({
	getLeadCrmFields: vi.fn(),
	updateLeadCrmFields: vi.fn(),
}))

const actor = { idUser: 7, email: 'a@x.co', roleCode: 'AGENTE', visibleUserIds: [7], canManage: true, idCategory: null }
const json = (method: string, body: unknown) =>
	new Request('http://x', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const field = { idLeadCustomField: 1, key: 'product', label: 'Producto', type: 'SELECT' as const, options: ['A'], position: 0 }

describe('/api/crm/custom-fields', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: true, actor })
	})

	it('lists definitions for any CRM user', async () => {
		vi.mocked(listLeadCustomFields).mockResolvedValue([field])
		expect((await GET()).status).toBe(200)
		expect(requireCrmActor).toHaveBeenCalledWith('crm_lead_fields')
	})

	it('creates a definition (managers) and validates it', async () => {
		vi.mocked(createLeadCustomField).mockResolvedValue({ ok: true, field })
		expect((await POST(json('POST', { key: 'product', label: 'Producto', type: 'SELECT', options: ['A'] }))).status).toBe(201)
		expect(requireCrmActor).toHaveBeenCalledWith('crm_lead_fields', { manage: true })
		expect((await POST(json('POST', { key: 'Product', label: 'P', type: 'TEXT' }))).status).toBe(400)
		expect((await POST(json('POST', { key: 'product', label: 'P', type: 'SELECT' }))).status).toBe(400)
		expect((await POST(json('POST', { key: 'product', label: 'P', type: 'TEXT', options: ['A'] }))).status).toBe(400)
		vi.mocked(createLeadCustomField).mockResolvedValue({ ok: false, reason: 'DUPLICATE_KEY' })
		expect((await POST(json('POST', { key: 'product', label: 'P', type: 'TEXT' }))).status).toBe(409)
	})

	it('updates and deactivates a definition', async () => {
		vi.mocked(updateLeadCustomField).mockResolvedValue({ ok: false, reason: 'OPTIONS_NOT_ALLOWED' })
		expect((await PATCH(json('PATCH', { options: ['A'] }), ctx('1'))).status).toBe(400)
		vi.mocked(updateLeadCustomField).mockResolvedValue({ ok: false, reason: 'NOT_FOUND' })
		expect((await PATCH(json('PATCH', { label: 'X' }), ctx('1'))).status).toBe(404)
		expect((await PATCH(json('PATCH', { type: 'TEXT' }), ctx('1'))).status).toBe(400)
		vi.mocked(deactivateLeadCustomField).mockResolvedValue({ ok: true })
		expect((await DELETE(new Request('http://x'), ctx('1'))).status).toBe(200)
	})
})

describe('/api/leads/[id]/crm-fields', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: true, actor })
		vi.mocked(findScopedLead).mockResolvedValue({ idLead: 10 } as never)
	})

	it('reads the CRM fields of a lead in scope', async () => {
		vi.mocked(getLeadCrmFields).mockResolvedValue({ estimatedValue: null, probability: null, customFieldValues: {} })
		expect((await GET_FIELDS(new Request('http://x'), ctx('10'))).status).toBe(200)
		vi.mocked(findScopedLead).mockResolvedValue(null)
		expect((await GET_FIELDS(new Request('http://x'), ctx('10'))).status).toBe(404)
	})

	it('updates with management rights and validates ranges', async () => {
		vi.mocked(updateLeadCrmFields).mockResolvedValue({ ok: true, fields: { estimatedValue: '1', probability: 50, customFieldValues: {} } })
		expect((await PATCH_FIELDS(json('PATCH', { estimatedValue: '1', probability: 50 }), ctx('10'))).status).toBe(200)
		expect(requireCrmActor).toHaveBeenCalledWith('crm_lead_fields', { manage: true })
		expect(updateLeadCrmFields).toHaveBeenCalledWith(10, { estimatedValue: '1', probability: 50 }, expect.objectContaining({ userId: 7 }))

		expect((await PATCH_FIELDS(json('PATCH', { probability: 120 }), ctx('10'))).status).toBe(400)
		expect((await PATCH_FIELDS(json('PATCH', { estimatedValue: '-1' }), ctx('10'))).status).toBe(400)
		expect((await PATCH_FIELDS(json('PATCH', { name: 'x' }), ctx('10'))).status).toBe(400)

		vi.mocked(updateLeadCrmFields).mockResolvedValue({ ok: false, error: 'Campo desconocido: x' })
		const response = await PATCH_FIELDS(json('PATCH', { customFields: { x: 1 } }), ctx('10'))
		expect(response.status).toBe(400)
		await expect(response.json()).resolves.toEqual({ data: null, error: 'Campo desconocido: x' })
	})
})
