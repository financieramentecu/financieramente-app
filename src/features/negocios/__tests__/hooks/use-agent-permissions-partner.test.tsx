import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAgentPermissions } from '@/features/negocios/hooks/use-agent-permissions'
import { UserRole } from '@/features/auth/lib/roles'
import { createMockUserWithRole } from '@/features/shared/__tests__/fixtures/mockUserWithRole'

describe('useAgentPermissions — PARTNER owner (NEG-03, PA-04)', () => {
	it('locks the picker to the partner exactly like an agent', () => {
		const setValue = vi.fn()
		const partner = { ...createMockUserWithRole(UserRole.PARTNER), idUser: 77 }

		const { result } = renderHook(() =>
			useAgentPermissions({ currentUser: partner, setValue, mode: 'create' })
		)

		expect(result.current.isAgentUser).toBe(true)
		expect(result.current.canSearchAgents).toBe(false)
		expect(setValue).toHaveBeenCalledWith(
			'agent',
			'77',
			expect.objectContaining({ shouldValidate: true })
		)
		expect(result.current.agentsList.map((a) => a.idUser)).toEqual([77])
	})

	it('still treats AGENTE as a locked owner', () => {
		const setValue = vi.fn()
		const agent = { ...createMockUserWithRole(UserRole.AGENTE), idUser: 12 }

		const { result } = renderHook(() =>
			useAgentPermissions({ currentUser: agent, setValue, mode: 'create' })
		)

		expect(result.current.isAgentUser).toBe(true)
		expect(setValue).toHaveBeenCalledWith('agent', '12', expect.anything())
	})

	it.each([
		UserRole.ADMIN,
		UserRole.ANALISTA_SOPORTE,
		UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	])('%s can search owners and is not locked to self', (role) => {
		const setValue = vi.fn()
		const currentUser = createMockUserWithRole(role)
		const { result } = renderHook(() =>
			useAgentPermissions({
				currentUser,
				setValue,
				mode: 'create',
			})
		)

		expect(result.current.isAgentUser).toBe(false)
		expect(result.current.canSearchAgents).toBe(true)
		expect(setValue).not.toHaveBeenCalled()
	})

	it('CONSULTOR cannot search owners', () => {
		const currentUser = createMockUserWithRole(UserRole.CONSULTOR)
		const setValue = vi.fn()
		const { result } = renderHook(() =>
			useAgentPermissions({
				currentUser,
				setValue,
				mode: 'create',
			})
		)
		expect(result.current.canSearchAgents).toBe(false)
	})
})
