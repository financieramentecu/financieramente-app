import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../route'
import * as guard from '@/lib/auth/require-crm-actor'
import { createLead } from '@/features/leads/services/create-lead.service'

vi.mock('@/features/leads/services/create-lead.service', () => ({
	createLead: vi.fn(),
}))
vi.mock('@/features/leads/services/lead-board.service', () => ({
	getLeadBoard: vi.fn(),
}))
vi.mock('@/lib/auth/require-crm-actor', async (original) => {
	const actual = await original<typeof import('@/lib/auth/require-crm-actor')>()
	return {
		...actual,
		requireCrmActor: vi.fn(),
		actorLeadsMoneyStrategies: vi.fn(),
		toCrmRequestContext: vi.fn(() => ({
			userId: 1,
			email: 'creator@example.com',
		})),
	}
})
const actor = {
	idUser: 1,
	email: 'creator@example.com',
	roleCode: 'AGENTE',
	visibleUserIds: [],
	manageableUserIds: [1, 2],
	canManage: true,
	canViewOthersCrm: true,
	idCategory: null,
}
function request(body: unknown) {
	return new Request('http://localhost/api/leads', {
		method: 'POST',
		body: JSON.stringify(body),
	})
}
beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(guard.requireCrmActor).mockResolvedValue({ ok: true, actor })
	vi.mocked(guard.actorLeadsMoneyStrategies).mockResolvedValue(false)
	vi.mocked(createLead).mockResolvedValue({
		ok: true,
		lead: { idLead: 3, idUser: 1 },
	})
})
describe('POST /api/leads', () => {
	it('self-assigns by default and requires management rights', async () => {
		const response = await POST(request({ name: 'Ana', phone: '123' }))
		expect(response.status).toBe(201)
		expect(guard.requireCrmActor).toHaveBeenCalledWith('leads_module', {
			manage: true,
		})
		expect(createLead).toHaveBeenCalledWith(
			expect.any(Object),
			1,
			expect.objectContaining({ userId: 1 })
		)
	})
	it('rejects a leaf forging an owner', async () => {
		expect(
			(await POST(request({ name: 'Ana', phone: '123', idUser: 2 }))).status
		).toBe(403)
		expect(createLead).not.toHaveBeenCalled()
	})
	it('allows team leader to select within write scope', async () => {
		vi.mocked(guard.actorLeadsMoneyStrategies).mockResolvedValue(true)
		expect(
			(await POST(request({ name: 'Ana', phone: '123', idUser: 2 }))).status
		).toBe(201)
		expect(createLead).toHaveBeenCalledWith(
			expect.any(Object),
			2,
			expect.any(Object)
		)
	})
	it('rejects cross-branch assignment despite company-wide read grant', async () => {
		vi.mocked(guard.actorLeadsMoneyStrategies).mockResolvedValue(true)
		expect(
			(await POST(request({ name: 'Ana', phone: '123', idUser: 99 }))).status
		).toBe(403)
		expect(createLead).not.toHaveBeenCalled()
	})
	it('allows administrator company-wide owner selection', async () => {
		vi.mocked(guard.requireCrmActor).mockResolvedValue({
			ok: true,
			actor: { ...actor, roleCode: 'ADMIN', manageableUserIds: [] },
		})
		vi.mocked(guard.actorLeadsMoneyStrategies).mockResolvedValue(true)
		expect(
			(await POST(request({ name: 'Ana', phone: '123', idUser: 99 }))).status
		).toBe(201)
	})
	it.each([401, 403, 404])(
		'preserves guard response %d without writes',
		async (status) => {
			vi.mocked(guard.requireCrmActor).mockResolvedValue({
				ok: false,
				response: guard.crmErrorResponse('denied', status),
			})
			expect((await POST(request({ name: 'Ana', phone: '123' }))).status).toBe(
				status
			)
			expect(createLead).not.toHaveBeenCalled()
		}
	)
	it('rejects invalid and malformed bodies', async () => {
		expect((await POST(request({ name: 'Ana' }))).status).toBe(400)
		expect(
			(
				await POST(
					new Request('http://localhost/api/leads', {
						method: 'POST',
						body: '{',
					})
				)
			).status
		).toBe(400)
		expect(createLead).not.toHaveBeenCalled()
	})
	it('returns a useful contact conflict', async () => {
		vi.mocked(createLead).mockResolvedValue({
			ok: false,
			error: 'Contacto existente',
			status: 409,
		})
		expect((await POST(request({ name: 'Ana', phone: '123' }))).status).toBe(
			409
		)
	})
})
