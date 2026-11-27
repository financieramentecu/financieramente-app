import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAuth } from '../require-role'
import { roleCan } from '@/features/access-control/services/role-permission-check'

vi.mock('../require-role', async () => {
	const actual = await vi.importActual<typeof import('../require-role')>('../require-role')
	return { ...actual, requireAuth: vi.fn() }
})

vi.mock('@/features/access-control/services/role-permission-check', () => ({
	roleCan: vi.fn(),
}))

vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

import { requireWriteAccess } from '../require-write-access'

/** A custom role that may create businesses but not edit them. */
const CREATE_ONLY_ROLE = 'E2E_CREATE_ONLY'

describe('requireWriteAccess with a create-only role', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireAuth).mockResolvedValue({
			ok: true,
			session: { user: { role: CREATE_ONLY_ROLE } },
		} as never)
		vi.mocked(roleCan).mockImplementation(async (_role, code) => code === 'negocios.crear')
	})

	it('lets the creation flow through with negocios.crear', async () => {
		const guard = await requireWriteAccess('negocios.crear')
		expect(guard.ok).toBe(true)
		expect(roleCan).toHaveBeenCalledWith(CREATE_ONLY_ROLE, 'negocios.crear')
	})

	it('still rejects edits, which need negocios.editar', async () => {
		const guard = await requireWriteAccess()
		expect(guard.ok).toBe(false)
		if (!guard.ok) expect(guard.response.status).toBe(403)
		expect(roleCan).toHaveBeenCalledWith(CREATE_ONLY_ROLE, 'negocios.editar')
	})
})
