import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMoneyStrategists } from '../use-money-strategists'

beforeEach(() => {
	vi.restoreAllMocks()
})

const mockAgentsResponse = {
	data: {
		agents: [
			{ id: 10, name: 'Ana', lastName: 'García' },
			{ id: 11, name: 'Luis', lastName: null },
		],
		showFilter: true,
	},
}

describe('useMoneyStrategists', () => {
	it('starts in loading state', () => {
		global.fetch = vi.fn().mockReturnValue(new Promise(() => {}))

		const { result } = renderHook(() => useMoneyStrategists())

		expect(result.current.status).toBe('loading')
	})

	it('transitions to success and maps agents correctly', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockAgentsResponse),
		})

		const { result } = renderHook(() => useMoneyStrategists())

		await waitFor(() => expect(result.current.status).toBe('success'))

		expect(result.current.data?.showFilter).toBe(true)
		expect(result.current.data?.strategists).toHaveLength(2)
		expect(result.current.data?.strategists[0]).toEqual({ id: 10, name: 'Ana García' })
		expect(result.current.data?.strategists[1]).toEqual({ id: 11, name: 'Luis' })
	})

	it('omits null lastName from display name', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({
				data: {
					agents: [{ id: 20, name: 'Solo', lastName: null }],
					showFilter: true,
				},
			}),
		})

		const { result } = renderHook(() => useMoneyStrategists())

		await waitFor(() => expect(result.current.status).toBe('success'))

		expect(result.current.data?.strategists[0].name).toBe('Solo')
	})

	it('returns showFilter=false when API indicates MS Junior', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: { agents: [], showFilter: false } }),
		})

		const { result } = renderHook(() => useMoneyStrategists())

		await waitFor(() => expect(result.current.status).toBe('success'))

		expect(result.current.data?.showFilter).toBe(false)
		expect(result.current.data?.strategists).toHaveLength(0)
	})

	it('transitions to error on non-ok response', async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: false })

		const { result } = renderHook(() => useMoneyStrategists())

		await waitFor(() => expect(result.current.status).toBe('error'))

		expect(result.current.error).toBe('Error al cargar money strategists')
	})

	it('transitions to error on fetch rejection', async () => {
		global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'))

		const { result } = renderHook(() => useMoneyStrategists())

		await waitFor(() => expect(result.current.status).toBe('error'))

		expect(result.current.error).toBe('Network failure')
	})

	it('calls /api/agents', async () => {
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve(mockAgentsResponse),
		})

		const { result } = renderHook(() => useMoneyStrategists())

		await waitFor(() => expect(result.current.status).toBe('success'))

		expect(global.fetch).toHaveBeenCalledWith('/api/agents')
	})
})
