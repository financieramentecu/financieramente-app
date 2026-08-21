import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAgentPermissions } from '@/features/negocios/hooks/use-agent-permissions'
import { createMockAgentInfo } from '@/features/negocios/__tests__/fixtures/mock-business'
import { mockUserWithRole } from '@/features/shared/__tests__/fixtures/mockUserWithRole'

describe('useAgentPermissions — lead-owner lock (leadId + businessAgent)', () => {
	it('is NOT locked when leadId is absent, even with a businessAgent present', () => {
		const setValue = vi.fn()
		const businessAgent = createMockAgentInfo({ id: 9 })

		const { result } = renderHook(() =>
			useAgentPermissions({
				currentUser: mockUserWithRole,
				setValue,
				mode: 'create',
				businessAgent,
			})
		)

		expect(result.current.isLeadOwnerLocked).toBe(false)
		expect(setValue).not.toHaveBeenCalledWith(
			'agent',
			'9',
			expect.anything()
		)
	})

	it('is NOT locked when leadId is present but the lead has no owner (no businessAgent)', () => {
		const setValue = vi.fn()

		const { result } = renderHook(() =>
			useAgentPermissions({
				currentUser: mockUserWithRole,
				setValue,
				mode: 'create',
				leadId: 7,
			})
		)

		expect(result.current.isLeadOwnerLocked).toBe(false)
	})

	it('is locked and defaults the agent field when leadId + businessAgent are both present', () => {
		const setValue = vi.fn()
		const businessAgent = createMockAgentInfo({ id: 9 })

		const { result } = renderHook(() =>
			useAgentPermissions({
				currentUser: mockUserWithRole,
				setValue,
				mode: 'create',
				leadId: 7,
				businessAgent,
			})
		)

		expect(result.current.isLeadOwnerLocked).toBe(true)
		expect(setValue).toHaveBeenCalledWith(
			'agent',
			'9',
			expect.objectContaining({ shouldValidate: true })
		)
		expect(result.current.agentsList.some((a) => a.idUser === 9)).toBe(true)
	})

	it('the lead-owner default overrides the current-user-is-agent self-assignment', () => {
		const setValue = vi.fn()
		const businessAgent = createMockAgentInfo({ id: 9 })
		const currentAgentUser = {
			...mockUserWithRole,
			idUser: 3,
			role: { ...mockUserWithRole.role!, code: 'AGENTE' },
		}

		renderHook(() =>
			useAgentPermissions({
				currentUser: currentAgentUser,
				setValue,
				mode: 'create',
				leadId: 7,
				businessAgent,
			})
		)

		const lastAgentCall = setValue.mock.calls
			.filter((call) => call[0] === 'agent')
			.at(-1)
		expect(lastAgentCall?.[1]).toBe('9')
	})

	it('is never locked in edit mode, even with leadId + businessAgent present', () => {
		const setValue = vi.fn()
		const businessAgent = createMockAgentInfo({ id: 9 })

		const { result } = renderHook(() =>
			useAgentPermissions({
				currentUser: mockUserWithRole,
				setValue,
				mode: 'edit',
				leadId: 7,
				businessAgent,
			})
		)

		expect(result.current.isLeadOwnerLocked).toBe(false)
	})
})
