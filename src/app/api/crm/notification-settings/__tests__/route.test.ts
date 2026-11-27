import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, PUT } from '../route'
import { requireCrmActor } from '@/lib/auth/require-crm-actor'
import { roleCan } from '@/features/access-control/services/role-permission-check'
import { getTaskNoticeSetting, saveTaskNoticeSetting } from '@/features/leads/tasks/crm-notification-setting.service'

vi.mock('@/lib/auth/require-crm-actor', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/lib/auth/require-crm-actor')>()),
	requireCrmActor: vi.fn(),
}))
vi.mock('@/features/access-control/services/role-permission-check', () => ({ roleCan: vi.fn() }))
vi.mock('@/features/leads/tasks/crm-notification-setting.service', () => ({
	getTaskNoticeSetting: vi.fn(),
	saveTaskNoticeSetting: vi.fn(),
}))

const actor = {
	idUser: 7,
	email: 'a@x.co',
	roleCode: 'ADMIN',
	visibleUserIds: [],
	manageableUserIds: [],
	canViewOthersCrm: false,
	canManage: true,
	idCategory: null,
}
const json = (body: unknown) => new Request('http://x', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('/api/crm/notification-settings', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: true, actor })
		vi.mocked(roleCan).mockResolvedValue(true)
	})

	it('returns the anticipation days to CRM managers', async () => {
		vi.mocked(getTaskNoticeSetting).mockResolvedValue({ anticipationDays: 2 })
		const response = await GET()
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ data: { anticipationDays: 2 } })
		expect(requireCrmActor).toHaveBeenCalledWith('crm_tasks', { manage: true })
	})

	it('saves a valid anticipation and rejects values outside 0..30', async () => {
		vi.mocked(saveTaskNoticeSetting).mockResolvedValue({ anticipationDays: 4 })
		expect((await PUT(json({ anticipationDays: 4 }))).status).toBe(200)
		expect(saveTaskNoticeSetting).toHaveBeenCalledWith(4, expect.objectContaining({ userId: 7, email: 'a@x.co' }))
		expect((await PUT(json({ anticipationDays: 31 }))).status).toBe(400)
		expect((await PUT(json({ anticipationDays: -1 }))).status).toBe(400)
		expect((await PUT(json({ anticipationDays: 1.5 }))).status).toBe(400)
		expect(saveTaskNoticeSetting).toHaveBeenCalledTimes(1)
	})
})


describe('global task notice administration', () => {
	beforeEach(() => vi.clearAllMocks())

	it('rejects an AGENTE before reading or changing company-wide settings', async () => {
		vi.mocked(requireCrmActor).mockResolvedValue({ ok: true, actor: { ...actor, roleCode: 'AGENTE' } })
		vi.mocked(roleCan).mockResolvedValue(false)
		expect((await GET()).status).toBe(403)
		expect((await PUT(json({ anticipationDays: 0 }))).status).toBe(403)
		expect(getTaskNoticeSetting).not.toHaveBeenCalled()
		expect(saveTaskNoticeSetting).not.toHaveBeenCalled()
	})
})
