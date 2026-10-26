import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSearchAgents } from '@/features/negocios/hooks/use-search-agents'
import { UserRole } from '@/features/auth/lib/roles'

describe('useSearchAgents role filter', () => {
	const fetchMock = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: [] }) })
		vi.stubGlobal('fetch', fetchMock)
	})

	it('sends a single role as-is', async () => {
		const { result } = renderHook(() => useSearchAgents())
		await act(async () => {
			await result.current.handleSearchAgents('ana', UserRole.AGENTE)
		})
		expect(
			new URL(fetchMock.mock.calls[0][0], 'http://x').searchParams.get('role')
		).toBe('AGENTE')
	})

	it('sends several roles as a comma separated list (agents and partners)', async () => {
		const { result } = renderHook(() => useSearchAgents())
		await act(async () => {
			await result.current.handleSearchAgents('ana', [
				UserRole.AGENTE,
				UserRole.PARTNER,
			])
		})
		expect(
			new URL(fetchMock.mock.calls[0][0], 'http://x').searchParams.get('role')
		).toBe('AGENTE,PARTNER')
	})
})
