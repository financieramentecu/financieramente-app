import { beforeEach, describe, expect, it, vi } from 'vitest'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getAccessibleUserIds } from '@/features/auth/lib/hierarchy'
import { DEFAULT_ROLE_GRANTS } from '@/features/access-control/catalog/default-role-grants'
import { can, getScope } from '@/features/access-control/lib/authorization'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { isLeadVisible } from '@/features/leads/services/lead-board.service'
import {
	canAssignWithinScope,
	findScopedLead,
	parsePositiveId,
	requireCrmActor,
} from '../require-crm-actor'

function grantsOf(role: string | null | undefined) {
	return (DEFAULT_ROLE_GRANTS as Record<string, never>)[role ?? ''] ?? {}
}

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/features/negocios/services/user.service', () => ({ getCurrentUserByEmail: vi.fn() }))
vi.mock('@/features/auth/lib/hierarchy', () => ({
	getAccessibleUserIds: vi.fn(),
}))
vi.mock('@/features/access-control/services/role-permission-check', () => ({
	roleCan: vi.fn(async (role: string, code: string) => can(grantsOf(role), code)),
	roleScope: vi.fn(async (role: string, code: string) => getScope(grantsOf(role), code)),
}))
vi.mock('@/features/shared/lib/flagsmith-server', () => ({ isFeatureEnabledServer: vi.fn() }))
vi.mock('@/features/leads/services/lead-board.service', () => ({ isLeadVisible: vi.fn() }))
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
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({ idUser: 2, role: { code: 'SIN_ROL' } } as never)
		const result = await requireCrmActor('crm_tasks')
		if (!result.ok) expect(result.response.status).toBe(403)
	})

	it('returns 403 for a role without CRM write access when management is required', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({ idUser: 3, role: { code: 'CONSULTOR' } } as never)
		const result = await requireCrmActor('crm_tasks', { manage: true })
		if (!result.ok) expect(result.response.status).toBe(403)
	})

	it.each([false, true])('enforces the consultant CRM grant (%s)', async (granted) => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 3,
			role: { code: 'CONSULTOR' },
			canViewOthersCrm: granted,
		} as never)
		const result = await requireCrmActor('crm_tasks')
		expect(result.ok).toBe(granted)
		if (!result.ok) expect(result.response.status).toBe(403)
		if (result.ok) {
			expect(result.actor.visibleUserIds).toEqual([])
			expect(result.actor.canManage).toBe(false)
		}
	})

	it('resolves the actor with its hierarchy scope', async () => {
		const result = await requireCrmActor('crm_tasks')
		expect(result.ok).toBe(true)
		if (result.ok) {
			expect(result.actor).toMatchObject({
				idUser: 7,
				email: 'a@x.co',
				roleCode: 'AGENTE',
				visibleUserIds: [7, 8],
				manageableUserIds: [7, 8],
				canViewOthersCrm: false,
				canManage: true,
				idCategory: null,
			})
		}
	})

	it('uses an empty scope (all) for company-scope writers', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({ idUser: 1, role: { code: 'ADMIN' } } as never)
		const result = await requireCrmActor('crm_tasks')
		if (result.ok) {
			expect(result.actor.visibleUserIds).toEqual([])
			expect(result.actor.manageableUserIds).toEqual([])
		}
		expect(getAccessibleUserIds).not.toHaveBeenCalled()
	})

	it('lets a granted advisor read the company and manage only their branch', async () => {
		vi.mocked(getCurrentUserByEmail).mockResolvedValue({
			idUser: 7,
			role: { code: 'AGENTE' },
			canViewOthersCrm: true,
		} as never)
		const result = await requireCrmActor('crm_tasks')
		if (result.ok) {
			expect(result.actor.visibleUserIds).toEqual([])
			expect(result.actor.manageableUserIds).toEqual([7, 8])
			expect(result.actor.canViewOthersCrm).toBe(true)
			expect(result.actor.canManage).toBe(true)
		}
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

	it('refuses an assignee outside the writable branch even when reads are company-wide', () => {
		expect(
			canAssignWithinScope({ idUser: 7, visibleUserIds: [], manageableUserIds: [7, 8] }, 99)
		).toBe(false)
	})
})

describe('findScopedLead', () => {
	it('checks visibility with the actor scope and does not load the lead body', async () => {
		vi.mocked(isLeadVisible).mockResolvedValue(true)
		const actor = { idUser: 7, roleCode: 'AGENTE', visibleUserIds: [7] } as never
		await expect(findScopedLead(actor, 4)).resolves.toBe(true)
		expect(isLeadVisible).toHaveBeenCalledWith(4, { idUser: 7, role: { code: 'AGENTE' } }, { visibleUserIds: [7] })
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
