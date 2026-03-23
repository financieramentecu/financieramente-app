import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '../use-auth'
import type { Session } from 'next-auth'
import { UserRole } from '@/features/auth/lib/roles'

// Mock useSession de next-auth/react
vi.mock('next-auth/react', () => ({
	useSession: vi.fn(),
}))

import { useSession } from 'next-auth/react'

describe('useAuth', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should return loading state when session is loading', () => {
		vi.mocked(useSession).mockReturnValue({
			data: null,
			status: 'loading',
			update: vi.fn(),
		} as ReturnType<typeof useSession>)

		const { result } = renderHook(() => useAuth())

		expect(result.current.isLoading).toBe(true)
		expect(result.current.isAuthenticated).toBe(false)
		expect(result.current.session).toBeNull()
	})

	it('should return authenticated state when session exists', () => {
		const mockSession: Session = {
			user: {
				id: '1',
				email: 'test@financieramentecu.com',
				name: 'Test User',
				role: UserRole.ADMIN,
			},
			expires: '2024-12-31T23:59:59.999Z',
		}

		vi.mocked(useSession).mockReturnValue({
			data: mockSession,
			status: 'authenticated',
			update: vi.fn(),
		} as ReturnType<typeof useSession>)

		const { result } = renderHook(() => useAuth())

		expect(result.current.isLoading).toBe(false)
		expect(result.current.isAuthenticated).toBe(true)
		expect(result.current.session).toEqual(mockSession)
	})

	it('should return unauthenticated state when session is unauthenticated', () => {
		vi.mocked(useSession).mockReturnValue({
			data: null,
			status: 'unauthenticated',
			update: vi.fn(),
		} as ReturnType<typeof useSession>)

		const { result } = renderHook(() => useAuth())

		expect(result.current.isLoading).toBe(false)
		expect(result.current.isAuthenticated).toBe(false)
		expect(result.current.session).toBeNull()
	})

	it('should return unauthenticated when status is loading', () => {
		vi.mocked(useSession).mockReturnValue({
			data: null,
			status: 'loading',
			update: vi.fn(),
		} as ReturnType<typeof useSession>)

		const { result } = renderHook(() => useAuth())

		expect(result.current.isLoading).toBe(true)
		expect(result.current.isAuthenticated).toBe(false)
		expect(result.current.session).toBeNull()
	})
})
