import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('@/lib/api/client', () => ({ apiClient: { get: vi.fn() } }))

import { apiClient } from '@/lib/api/client'
import { useLeaders } from '../use-leaders'

function user(id: number, overrides: Record<string, unknown> = {}) {
	return {
		id,
		name: `User${id}`,
		lastName: 'Test',
		email: `u${id}@x.com`,
		role: { code: 'AGENTE', name: 'Agente' },
		level: { code: 'LEVEL_3' },
		active: true,
		...overrides,
	}
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('useLeaders — partner exclusion (PM-03, ADM-01)', () => {
	it('never lists PARTNER_EXTERNAL users or PARTNER-role users as leader candidates', async () => {
		vi.mocked(apiClient.get).mockResolvedValue({
			success: true,
			data: [
				user(1),
				user(2, { level: { code: 'PARTNER_EXTERNAL' } }),
				user(3, {
					role: { code: 'PARTNER', name: 'Partner' },
					level: { code: 'PARTNER_EXTERNAL' },
				}),
				user(4, { level: null }),
			],
		})

		const { result } = renderHook(() => useLeaders())
		await waitFor(() => expect(result.current.isLoading).toBe(false))

		expect(result.current.leaders.map((l) => l.id)).toEqual([1, 4])
	})
})
