import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAuth } from '../require-role'

vi.mock('../require-role', async () => {
	const actual = await vi.importActual<typeof import('../require-role')>(
		'../require-role'
	)
	return {
		...actual,
		requireAuth: vi.fn(),
	}
})

vi.mock('next/server', () => ({
	NextResponse: {
		json: vi.fn((data, init) => ({
			json: () => Promise.resolve(data),
			status: init?.status || 200,
		})),
	},
}))

import { requireWriteAccess } from '../require-write-access'

describe('requireWriteAccess', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns a 403 failure for CONSULTOR (read-only role)', async () => {
		vi.mocked(requireAuth).mockResolvedValue({
			ok: true,
			session: { user: { role: 'CONSULTOR' } },
		} as never)

		const guard = await requireWriteAccess()

		expect(guard.ok).toBe(false)
		if (!guard.ok) {
			expect(guard.response.status).toBe(403)
			const json = await guard.response.json()
			expect(json.error).toBe('Sin permisos')
		}
	})

	it('passes through for a write-capable role (ADMIN)', async () => {
		vi.mocked(requireAuth).mockResolvedValue({
			ok: true,
			session: { user: { role: 'ADMIN' } },
		} as never)

		const guard = await requireWriteAccess()

		expect(guard.ok).toBe(true)
	})

	it('propagates the 401 failure from requireAuth when there is no session', async () => {
		vi.mocked(requireAuth).mockResolvedValue({
			ok: false,
			response: { status: 401 },
		} as never)

		const guard = await requireWriteAccess()

		expect(guard.ok).toBe(false)
		if (!guard.ok) {
			expect(guard.response.status).toBe(401)
		}
	})
})
