import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getAccessibleUserIds, isHierarchyBypassRole } from '@/features/auth/lib/hierarchy'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { getLeadDetail } from '@/features/leads/services/lead-board.service'
import {
	canAssignWithinScope,
	findScopedLead,
	parsePositiveId,
	requireCrmActor,
} from '../require-crm-actor'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/features/negocios/services/user.service', () => ({ getCurrentUserByEmail: vi.fn() }))
vi.mock('@/features/auth/lib/hierarchy', () => ({
	getAccessibleUserIds: vi.fn(),
	isHierarchyBypassRole: vi.fn(),
}))
vi.mock('@/features/shared/lib/flagsmith-server', () => ({ isFeatureEnabledServer: vi.fn() }))
vi.mock('@/features/leads/services/lead-board.service', () => ({ getLeadDetail: vi.fn() }))
vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({ status: init?.status ?? 200, json: () => Promise.resolve(data) })),
	},
}))

describe('requireCrmActor', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(auth).mockResolvedValue({ user: { email: 'a@x.co' } } as never)
		vi.mocked(isFeatureEnabledServer).mockResolvedValue(true)
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({ idUser: 7, role: { code: 'AGENTE' } } as never)
		vi.mocked(isHierarchyBypassRole).mockReturnValue(false)
		vi.mocked(getAccessibleUserIds).mockResolvedValue([7, 8])
	})

	it('returns 401 without a session', async () => {
		vi.mocked(auth).mockResolvedValue(null as never)
		const result = await requireCrmActor('crm_tasks')
		expect(result.ok).toBe(false)
		if (!result.ok) expect(result.response.status).toBe(401)
	})

	it('returns 404 while the flag is off', async () => {
		vi.mocked(isFeatureEnabledServer).mockResolvedValue(false)
		const result = await requireCrmActor('crm_tasks')
		if (!result.ok) expect(result.response.status).toBe(404)
		expect(getCurrentUserByEmail).not.toHaveBeenCalled()
	})

	it('returns 403 for a role without CRM access', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({ idUser: 2, role: { code: 'DEFAULT' } } as never)
		const result = await requireCrmActor('crm_tasks')
		if (!result.ok) expect(result.response.status).toBe(403)
	})

	it('returns 403 for a read-only role when management is required', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({ idUser: 3, role: { code: 'CONSULTOR' } } as never)
		const result = await requireCrmActor('crm_tasks', { manage: true })
		if (!result.ok) expect(result.response.status).toBe(403)
	})

	it('resolves the actor with its hierarchy scope', async () => {
		const result = await requireCrmActor('crm_tasks')
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.actor).toMatchObject({ idUser: 7, email: 'a@x.co', roleCode: 'AGENTE', visibleUserIds: [7, 8], canManage: true, idCategory: null })
		}
	})

	it('uses an empty scope (all) for bypass roles', async () => {
		vi.mocked(isHierarchyBypassRole).mockReturnValue(true)
		const result = await requireCrmActor('crm_tasks')
		if (result.ok) expect(result.actor.visibleUserIds).toEqual([])
		expect(getAccessibleUserIds).not.toHaveBeenCalled()
	})
})

describe('canAssignWithinScope', () => {
	const actor = { idUser: 7, visibleUserIds: [7, 8] }
	it.each([
		[undefined, true],
		[7, true],
		[8, true],
		[9, false],
	])('assignee %s → %s', (assignee, expected) => {
		expect(canAssignWithinScope(actor, assignee)).toBe(expected)
	})
	it('allows anyone for bypass scope', () => {
		expect(canAssignWithinScope({ idUser: 1, visibleUserIds: [] }, 99)).toBe(true)
	})
})

describe('findScopedLead', () => {
	it('delegates to getLeadDetail with the actor scope', async () => {
		vi.mocked(getLeadDetail).mockResolvedValue({ idLead: 4 } as never)
		const actor = { idUser: 7, roleCode: 'AGENTE', visibleUserIds: [7] } as never
		await expect(findScopedLead(actor, 4)).resolves.toEqual({ idLead: 4 })
		expect(getLeadDetail).toHaveBeenCalledWith(4, { idUser: 7, role: { code: 'AGENTE' } }, { visibleUserIds: [7] })
	})
})

describe('parsePositiveId', () => {
	it.each([
		['5', 5],
		['0', null],
		['-1', null],
		['abc', null],
	])('%s → %s', (value, expected) => {
		expect(parsePositiveId(value)).toBe(expected)
	})
})
