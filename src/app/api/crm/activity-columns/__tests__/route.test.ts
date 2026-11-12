import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../route'
import { PATCH } from '../[code]/route'
import { requireCrmActor } from '@/lib/auth/require-crm-actor'
import { listActivityColumns, renameActivityColumn } from '@/features/leads/agenda/activity-column.service'

vi.mock('@/lib/auth/require-crm-actor', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/auth/require-crm-actor')>()),
	requireCrmActor: vi.fn(),
}))
vi.mock('@/features/leads/agenda/activity-column.service', () => ({
	listActivityColumns: vi.fn(),
	renameActivityColumn: vi.fn(),
}))

const actor = { idUser: 7, email: 'a@x.co', roleCode: 'AGENTE', visibleUserIds: [7], canManage: true, idCategory: null }
const json = (body: unknown) =>
	new Request('http://x', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const ctx = (code: string) => ({ params: Promise.resolve({ code }) })
const overdue = { code: 'overdue' as const, name: 'Atrasadas', position: 0 }

describe('/api/crm/activity-columns', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: true, actor })
	})

	it('lists column titles for any CRM user', async () => {
		vi.mocked(listActivityColumns).mockResolvedValue([overdue])
		expect((await GET()).status).toBe(200)
		expect(requireCrmActor).toHaveBeenCalledWith('crm_tasks')
	})

	it('renames a column only with management rights', async () => {
		vi.mocked(renameActivityColumn).mockResolvedValue({ ok: true, column: overdue })
		expect((await PATCH(json({ name: 'Atrasadas' }), ctx('overdue'))).status).toBe(200)
		expect(requireCrmActor).toHaveBeenCalledWith('crm_tasks', { manage: true })
	})

	it('maps an invalid name, an unknown column and a duplicate title', async () => {
		expect((await PATCH(json({ name: '' }), ctx('overdue'))).status).toBe(400)
		vi.mocked(renameActivityColumn).mockResolvedValueOnce({ ok: false, reason: 'UNKNOWN_COLUMN' })
		expect((await PATCH(json({ name: 'Luego' }), ctx('later'))).status).toBe(404)
		vi.mocked(renameActivityColumn).mockResolvedValueOnce({ ok: false, reason: 'DUPLICATE' })
		expect((await PATCH(json({ name: 'Vencen hoy' }), ctx('overdue'))).status).toBe(409)
	})
})
