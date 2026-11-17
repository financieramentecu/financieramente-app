import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth/nextauth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import { auth } from '@/lib/auth/nextauth'
import { requireActionPermission } from '../require-action-permission'
import { roleCan } from '@/features/access-control/services/role-permission-check'
import { UserRole } from '@/features/auth/lib/roles'

const calculadoraAllowed = (role: string | undefined) =>
	roleCan(role, 'calculadora.usar')

describe('requireActionPermission', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('rejects an unauthenticated caller with "No autorizado" and never runs the check', async () => {
		vi.mocked(auth).mockResolvedValue(null as never)
		const check = vi.fn().mockReturnValue(true)

		const guard = await requireActionPermission(check)

		expect(guard).toEqual({ ok: false, error: 'No autorizado' })
		expect(check).not.toHaveBeenCalled()
	})

	it('rejects a session without a user', async () => {
		vi.mocked(auth).mockResolvedValue({} as never)
		expect(await requireActionPermission(calculadoraAllowed)).toEqual({
			ok: false,
			error: 'No autorizado',
		})
	})

	it.each([UserRole.PARTNER, UserRole.SIN_ROL, 'SOMETHING_NEW'])(
		'rejects %s with "Sin permisos" when the permission check fails',
		async (role) => {
			vi.mocked(auth).mockResolvedValue({ user: { role } } as never)
			expect(await requireActionPermission(calculadoraAllowed)).toEqual({
				ok: false,
				error: 'Sin permisos',
			})
		}
	)

	it('rejects a session whose role is missing', async () => {
		vi.mocked(auth).mockResolvedValue({ user: {} } as never)
		expect(await requireActionPermission(calculadoraAllowed)).toEqual({
			ok: false,
			error: 'Sin permisos',
		})
	})

	it.each([
		UserRole.ADMIN,
		UserRole.ASISTENTE_GERENCIA_OPERATIVA,
		UserRole.ANALISTA_SOPORTE,
		UserRole.AGENTE,
		UserRole.CONSULTOR,
	])('lets %s through and returns the session', async (role) => {
		const session = { user: { role } }
		vi.mocked(auth).mockResolvedValue(session as never)
		expect(await requireActionPermission(calculadoraAllowed)).toEqual({
			ok: true,
			session,
		})
	})

	it('without a predicate any authenticated role passes', async () => {
		vi.mocked(auth).mockResolvedValue({ user: { role: 'PARTNER' } } as never)
		expect((await requireActionPermission()).ok).toBe(true)
	})
})
