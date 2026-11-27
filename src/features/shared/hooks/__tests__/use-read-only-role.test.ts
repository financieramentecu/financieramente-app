import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSession } from 'next-auth/react'

vi.mock('next-auth/react', () => ({
	useSession: vi.fn(),
}))

import { DEFAULT_ROLE_GRANTS } from '@/features/access-control/catalog/default-role-grants'
import { useReadOnlyRole } from '../use-read-only-role'

describe('useReadOnlyRole', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns isReadOnly: true and the explanatory reason for CONSULTOR', () => {
		vi.mocked(useSession).mockReturnValue({
			data: { user: { role: 'CONSULTOR', grants: DEFAULT_ROLE_GRANTS['CONSULTOR'] } },
			status: 'authenticated',
		} as never)

		const { result } = renderHook(() => useReadOnlyRole())

		expect(result.current.isReadOnly).toBe(true)
		expect(result.current.reason).toBe(
			'Solo lectura: tu rol no permite esta acción'
		)
	})

	it('returns isReadOnly: false for a write-capable role (ADMIN)', () => {
		vi.mocked(useSession).mockReturnValue({
			data: { user: { role: 'ADMIN', grants: DEFAULT_ROLE_GRANTS['ADMIN'] } },
			status: 'authenticated',
		} as never)

		const { result } = renderHook(() => useReadOnlyRole())

		expect(result.current.isReadOnly).toBe(false)
	})

	it('fails closed (isReadOnly: true) when there is no session or no grants', () => {
		vi.mocked(useSession).mockReturnValue({
			data: null,
			status: 'unauthenticated',
		} as never)

		const { result } = renderHook(() => useReadOnlyRole())

		expect(result.current.isReadOnly).toBe(true)
	})
})
