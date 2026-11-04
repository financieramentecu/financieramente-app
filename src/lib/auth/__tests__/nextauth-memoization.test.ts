import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
	rawAuth: vi.fn(),
	createRequestMemoizedAuth: vi.fn(<T>(read: () => Promise<T>) => read),
}))

vi.mock('next-auth', () => ({
	default: vi.fn(() => ({
		handlers: { GET: vi.fn(), POST: vi.fn() },
		auth: mocks.rawAuth,
		signIn: vi.fn(),
		signOut: vi.fn(),
	})),
}))
vi.mock('../config', () => ({ authConfig: {} }))
vi.mock('../memoized-auth', () => ({
	createRequestMemoizedAuth: mocks.createRequestMemoizedAuth,
}))

import { auth } from '../nextauth'

beforeEach(() => {
	mocks.rawAuth.mockReset()
})

describe('nextauth exports (F5)', () => {
	it('exports a request-memoized, zero-argument auth built from the raw NextAuth auth', async () => {
		expect(mocks.createRequestMemoizedAuth).toHaveBeenCalledTimes(1)
		mocks.rawAuth.mockResolvedValueOnce({ user: { id: '1' } })

		await expect(auth()).resolves.toEqual({ user: { id: '1' } })
		// The memoized reader never forwards arguments to NextAuth's overloads.
		expect(mocks.rawAuth).toHaveBeenCalledWith()
	})
})
