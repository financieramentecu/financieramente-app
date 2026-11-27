import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAgentPermissions } from '@/features/negocios/hooks/use-agent-permissions'
import { UserRole } from '@/features/auth/lib/roles'
import { createMockUserWithRole } from '@/features/shared/__tests__/fixtures/mockUserWithRole'
import { can, getScope } from '@/features/access-control/lib/authorization'
import type { RoleGrants } from '@/features/access-control/types/access-control.types'

const state = vi.hoisted(() => ({ grants: {} as Record<string, unknown> }))
vi.mock('@/features/shared/hooks/use-permissions', () => ({
	usePermissions: () => ({
		can: (code: string) => can(state.grants as RoleGrants, code),
		scope: (code: string) => getScope(state.grants as RoleGrants, code),
	}),
}))

function render(grants: Record<string, unknown>) {
	state.grants = grants
	const setValue = vi.fn()
	const currentUser = { ...createMockUserWithRole(UserRole.AGENTE), idUser: 5 }
	const { result } = renderHook(() =>
		useAgentPermissions({ currentUser, setValue, mode: 'create' })
	)
	return { result, setValue }
}

describe('useAgentPermissions — negocios.asignar_strategist', () => {
	it('lets a role with negocios.ver OWN pick another strategist when assign is COMPANY', () => {
		const { result, setValue } = render({
			'negocios.crear': {},
			'negocios.ver': { scope: 'OWN' },
			'negocios.asignar_strategist': { scope: 'COMPANY' },
		})
		expect(result.current.isAgentUser).toBe(false)
		expect(result.current.canSearchAgents).toBe(true)
		expect(setValue).not.toHaveBeenCalledWith('agent', '5', expect.anything())
	})

	it.each([{ scope: 'OWN' }, { scope: 'TEAM' }, undefined])(
		'keeps the picker locked to self when assign is %j',
		(assign) => {
			const { result, setValue } = render({
				'negocios.crear': {},
				'negocios.ver': { scope: 'COMPANY' },
				...(assign ? { 'negocios.asignar_strategist': assign } : {}),
			})
			expect(result.current.isAgentUser).toBe(true)
			expect(result.current.canSearchAgents).toBe(false)
			expect(setValue).toHaveBeenCalledWith('agent', '5', expect.anything())
		}
	)
})
