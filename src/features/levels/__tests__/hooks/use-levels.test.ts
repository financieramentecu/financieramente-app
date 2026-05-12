import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLevels } from '../../hooks/use-levels'
import { levelApi } from '../../lib/level-api'
import {
	createMockLevel,
	createMockLevelListResponse,
} from '../fixtures/mock-level'

// Mock levelApi
vi.mock('../../lib/level-api', () => ({
	levelApi: {
		getLevels: vi.fn(),
	},
}))

describe('useLevels', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should start with loading state', async () => {
		const mockResponse = createMockLevelListResponse()
		vi.mocked(levelApi.getLevels).mockResolvedValueOnce({
			data: mockResponse,
		})

		const { result } = renderHook(() => useLevels())

		expect(result.current.state.status).toBe('loading')
		expect(result.current.state.data).toBeUndefined()

		await waitFor(() => {
			expect(result.current.state.status).not.toBe('loading')
		})
	})

	it('should fetch levels successfully (happy path)', async () => {
		const mockResponse = createMockLevelListResponse([
			createMockLevel({ idLevel: 1, name: 'Agente MMS' }),
			createMockLevel({ idLevel: 2, name: 'Agente Aliado' }),
		])

		vi.mocked(levelApi.getLevels).mockResolvedValueOnce({
			data: mockResponse,
		})

		const { result } = renderHook(() => useLevels())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockResponse)
		expect(result.current.state.data?.levels).toHaveLength(2)
		expect(result.current.state.error).toBe('')
	})

	it('should handle API error', async () => {
		vi.mocked(levelApi.getLevels).mockResolvedValueOnce({
			data: null,
			error: 'Error al obtener niveles',
		})

		const { result } = renderHook(() => useLevels())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Error al obtener niveles')
		expect(result.current.state.data).toBeUndefined()
	})

	it('should handle network error', async () => {
		vi.mocked(levelApi.getLevels).mockRejectedValueOnce(
			new Error('Network error')
		)

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { result } = renderHook(() => useLevels())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Network error')
		expect(result.current.state.data).toBeUndefined()

		consoleError.mockRestore()
	})

	it('should handle unknown error', async () => {
		vi.mocked(levelApi.getLevels).mockRejectedValueOnce('Unknown error')

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { result } = renderHook(() => useLevels())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe(
			'Error desconocido al obtener niveles'
		)

		consoleError.mockRestore()
	})

	it('should pass search params to API', async () => {
		const mockResponse = createMockLevelListResponse()
		vi.mocked(levelApi.getLevels).mockResolvedValueOnce({
			data: mockResponse,
		})

		renderHook(() =>
			useLevels({ search: 'Agente', page: 1, pageSize: 10 })
		)

		await waitFor(() => {
			expect(levelApi.getLevels).toHaveBeenCalledWith({
				search: 'Agente',
				page: 1,
				pageSize: 10,
			})
		})
	})

	it('should pass typeLevel filter to API', async () => {
		const mockResponse = createMockLevelListResponse()
		vi.mocked(levelApi.getLevels).mockResolvedValueOnce({
			data: mockResponse,
		})

		renderHook(() => useLevels({ typeLevel: 'MMS' }))

		await waitFor(() => {
			expect(levelApi.getLevels).toHaveBeenCalledWith({
				typeLevel: 'MMS',
			})
		})
	})

	it('should pass status filter to API', async () => {
		const mockResponse = createMockLevelListResponse()
		vi.mocked(levelApi.getLevels).mockResolvedValueOnce({
			data: mockResponse,
		})

		renderHook(() => useLevels({ status: 'active' }))

		await waitFor(() => {
			expect(levelApi.getLevels).toHaveBeenCalledWith({
				status: 'active',
			})
		})
	})

	it('should refetch when refetch() is called', async () => {
		const mockResponse = createMockLevelListResponse()
		vi.mocked(levelApi.getLevels).mockResolvedValue({
			data: mockResponse,
		})

		const { result } = renderHook(() => useLevels())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(levelApi.getLevels).toHaveBeenCalledTimes(1)

		await act(async () => {
			await result.current.refetch()
		})

		await waitFor(() => {
			expect(levelApi.getLevels).toHaveBeenCalledTimes(2)
		})
	})

	it('should refetch when params change', async () => {
		const mockResponse = createMockLevelListResponse()
		vi.mocked(levelApi.getLevels).mockResolvedValue({
			data: mockResponse,
		})

		const { rerender } = renderHook(
			({ search }: { search?: string }) => useLevels({ search }),
			{
				initialProps: { search: 'Agente' },
			}
		)

		await waitFor(() => {
			expect(levelApi.getLevels).toHaveBeenCalledWith({
				search: 'Agente',
			})
		})

		rerender({ search: 'MMS' })

		await waitFor(() => {
			expect(levelApi.getLevels).toHaveBeenCalledWith({
				search: 'MMS',
			})
		})
	})

	it('should handle empty params', async () => {
		const mockResponse = createMockLevelListResponse()
		vi.mocked(levelApi.getLevels).mockResolvedValueOnce({
			data: mockResponse,
		})

		renderHook(() => useLevels({}))

		await waitFor(() => {
			expect(levelApi.getLevels).toHaveBeenCalledWith({})
		})
	})

	it('should update state correctly on success', async () => {
		const mockLevels = [
			createMockLevel({ idLevel: 1, name: 'Level 1' }),
			createMockLevel({ idLevel: 2, name: 'Level 2' }),
		]
		const mockResponse = createMockLevelListResponse(mockLevels)

		vi.mocked(levelApi.getLevels).mockResolvedValueOnce({
			data: mockResponse,
		})

		const { result } = renderHook(() => useLevels())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data?.levels).toHaveLength(2)
		expect(result.current.state.data?.pagination.total).toBe(2)
		expect(result.current.state.error).toBe('')
	})
})
