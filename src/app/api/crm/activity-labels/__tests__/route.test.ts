import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '../route'
import { DELETE, PATCH } from '../[id]/route'
import { requireCrmActor } from '@/lib/auth/require-crm-actor'
import {
	createActivityLabel,
	deactivateActivityLabel,
	listActivityLabels,
	updateActivityLabel,
} from '@/features/leads/activities/activity-label.service'

vi.mock('@/lib/auth/require-crm-actor', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/auth/require-crm-actor')>()),
	requireCrmActor: vi.fn(),
}))
vi.mock('@/features/leads/activities/activity-label.service', () => ({
	listActivityLabels: vi.fn(),
	createActivityLabel: vi.fn(),
	updateActivityLabel: vi.fn(),
	deactivateActivityLabel: vi.fn(),
}))

const actor = { idUser: 7, email: 'a@x.co', roleCode: 'AGENTE', visibleUserIds: [7], canManage: true, idCategory: null }
const json = (method: string, body: unknown) =>
	new Request('http://x', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const visita = { idLeadActivityLabel: 9, name: 'Visita', color: '#111111', code: null }

describe('/api/crm/activity-labels', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: true, actor })
	})

	it('lists the catalogue for any CRM user', async () => {
		vi.mocked(listActivityLabels).mockResolvedValue([])
		expect((await GET()).status).toBe(200)
		expect(requireCrmActor).toHaveBeenCalledWith('crm_tasks')
	})

	it('creates labels only with management rights', async () => {
		vi.mocked(createActivityLabel).mockResolvedValue({ ok: true, label: visita })
		expect((await POST(json('POST', { name: 'Visita' }))).status).toBe(201)
		expect(requireCrmActor).toHaveBeenCalledWith('crm_tasks', { manage: true })
	})

	it('maps validation, duplicates and the last active label', async () => {
		expect((await POST(json('POST', { name: 'x', color: 'red' }))).status).toBe(400)
		vi.mocked(createActivityLabel).mockResolvedValue({ ok: false, reason: 'DUPLICATE' })
		expect((await POST(json('POST', { name: 'Visita' }))).status).toBe(409)
		vi.mocked(updateActivityLabel).mockResolvedValue({ ok: true, label: visita })
		expect((await PATCH(json('PATCH', { name: 'Visita', color: '#111111' }), ctx('9'))).status).toBe(200)
		vi.mocked(deactivateActivityLabel).mockResolvedValue({ ok: false, reason: 'LAST_ACTIVE' })
		expect((await DELETE(new Request('http://x'), ctx('9'))).status).toBe(409)
		vi.mocked(deactivateActivityLabel).mockResolvedValue({ ok: true })
		expect((await DELETE(new Request('http://x'), ctx('9'))).status).toBe(200)
	})
})
