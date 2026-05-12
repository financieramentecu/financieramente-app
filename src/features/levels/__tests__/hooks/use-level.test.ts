import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLevel } from '../../hooks/use-level'
import { levelApi } from '../../lib/level-api'
import { createMockLevel } from '../fixtures/mock-level'

// Mock levelApi
vi.mock('../../lib/level-api', () => ({
	levelApi: {
		getLevel: vi.fn(),
	},
}))

describe('useLevel', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should start with loading state', async () => {
		const mockLevel = createMockLevel()
		vi.mocked(levelApi.getLevel).mockResolvedValueOnce({
			data: mockLevel,
		})

		const { result } = renderHook(() => useLevel(1))

		expect(result.current.state.status).toBe('loading')
		expect(result.current.state.data).toBeUndefined()

		await waitFor(() => {
			expect(result.current.state.status).not.toBe('loading')
		})
	})

	it('should fetch level successfully (happy path)', async () => {
		const mockLevel = createMockLevel({
			idLevel: 1,
			code: 'LEVEL001',
			name: 'Agente Experto',
		})

		vi.mocked(levelApi.getLevel).mockResolvedValueOnce({
			data: mockLevel,
		})

		const { result } = renderHook(() => useLevel(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockLevel)
		expect(result.current.state.error).toBe('')
	})

	it('should handle API error (404)', async () => {
		vi.mocked(levelApi.getLevel).mockResolvedValueOnce({
			data: null,
			error: 'Nivel no encontrado',
		})

		const { result } = renderHook(() => useLevel(999))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Nivel no encontrado')
		expect(result.current.state.data).toBeUndefined()
	})

	it('should handle network error', async () => {
		vi.mocked(levelApi.getLevel).mockRejectedValueOnce(
			new Error('Network error')
		)

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { result } = renderHook(() => useLevel(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Network error')
		expect(result.current.state.data).toBeUndefined()

		consoleError.mockRestore()
	})

	it('should handle unknown error', async () => {
		vi.mocked(levelApi.getLevel).mockRejectedValueOnce('Unknown error')

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { result } = renderHook(() => useLevel(1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe(
			'Error desconocido al obtener nivel'
		)

		consoleError.mockRestore()
	})

	it('should pass correct ID to API', async () => {
		const mockLevel = createMockLevel()
		vi.mocked(levelApi.getLevel).mockResolvedValueOnce({
			data: mockLevel,
		})

		renderHook(() => useLevel(42))

		await waitFor(() => {
			expect(levelApi.getLevel).toHaveBeenCalledWith(42)
		})
	})

	it('should update state correctly on success', async () => {
		const mockLevel = createMockLevel({
			idLevel: 5,
			code: 'LEVEL005',
			name: 'Nivel Específico',
			typeLevel: 'ALIADO',
		})

		vi.mocked(levelApi.getLevel).mockResolvedValueOnce({
			data: mockLevel,
		})

		const { result } = renderHook(() => useLevel(5))

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data?.idLevel).toBe(5)
		expect(result.current.state.data?.code).toBe('LEVEL005')
		expect(result.current.state.data?.name).toBe('Nivel Específico')
		expect(result.current.state.data?.typeLevel).toBe('ALIADO')
	})

	it('should handle invalid ID (zero)', async () => {
		const { result } = renderHook(() => useLevel(0))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('ID de nivel inválido')
	})

	it('should handle invalid ID (negative)', async () => {
		const { result } = renderHook(() => useLevel(-1))

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('ID de nivel inválido')
	})
})
