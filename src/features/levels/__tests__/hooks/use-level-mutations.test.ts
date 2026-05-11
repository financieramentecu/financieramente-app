import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLevelMutations } from '../../hooks/use-level-mutations'
import { levelApi } from '../../lib/level-api'
import { createMockLevel } from '../fixtures/mock-level'

// Mock levelApi
vi.mock('../../lib/level-api', () => ({
	levelApi: {
		createLevel: vi.fn(),
		updateLevel: vi.fn(),
		deleteLevel: vi.fn(),
	},
}))

describe('useLevelMutations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('initial state', () => {
		it('should have idle state for all mutations', () => {
			const { result } = renderHook(() => useLevelMutations())

			expect(result.current.createState.status).toBe('idle')
			expect(result.current.updateState.status).toBe('idle')
			expect(result.current.deleteState.status).toBe('idle')
		})
	})

	describe('createLevel', () => {
		it('should set loading then success on success', async () => {
			const mockLevel = createMockLevel()
			vi.mocked(levelApi.createLevel).mockResolvedValueOnce({
				data: mockLevel,
			})

			const { result } = renderHook(() => useLevelMutations())

			await act(async () => {
				await result.current.createLevel({
					code: 'LEVEL001',
					name: 'Nuevo Nivel',
					typeLevel: 'MMS',
					color: '#1A73E8',
					status: true,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('success')
			})

			expect(result.current.createState.data).toEqual(mockLevel)
			expect(result.current.createState.error).toBe('')
		})

		it('should set loading then error on API error', async () => {
			vi.mocked(levelApi.createLevel).mockResolvedValueOnce({
				data: null,
				error: 'Error al crear nivel',
			})

			const { result } = renderHook(() => useLevelMutations())

			await act(async () => {
				await result.current.createLevel({
					code: 'LEVEL001',
					name: 'Nuevo Nivel',
					typeLevel: 'MMS',
					color: '#1A73E8',
					status: true,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('error')
			})

			expect(result.current.createState.error).toBe('Error al crear nivel')
			expect(result.current.createState.data).toBeUndefined()
		})

		it('should handle network error', async () => {
			vi.mocked(levelApi.createLevel).mockRejectedValueOnce(
				new Error('Network error')
			)

			const consoleError = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			const { result } = renderHook(() => useLevelMutations())

			await act(async () => {
				await result.current.createLevel({
					code: 'LEVEL001',
					name: 'Nuevo Nivel',
					typeLevel: 'MMS',
					color: '#1A73E8',
					status: true,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('error')
			})

			expect(result.current.createState.error).toBe('Network error')

			consoleError.mockRestore()
		})

		it('should pass correct data to API', async () => {
			vi.mocked(levelApi.createLevel).mockResolvedValueOnce({
				data: createMockLevel(),
			})

			const { result } = renderHook(() => useLevelMutations())

			const data = {
				code: 'LEVEL001',
				name: 'Nuevo Nivel',
				typeLevel: 'MMS' as const,
				descripcion: 'Descripción',
				color: '#1A73E8',
				status: true,
			}

			await act(async () => {
				await result.current.createLevel(data)
			})

			expect(levelApi.createLevel).toHaveBeenCalledWith(data)
		})
	})

	describe('updateLevel', () => {
		it('should set loading then success on success', async () => {
			const mockLevel = createMockLevel({ name: 'Nivel Actualizado' })
			vi.mocked(levelApi.updateLevel).mockResolvedValueOnce({
				data: mockLevel,
			})

			const { result } = renderHook(() => useLevelMutations())

			await act(async () => {
				await result.current.updateLevel(1, {
					name: 'Nivel Actualizado',
				})
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('success')
			})

			expect(result.current.updateState.data).toEqual(mockLevel)
			expect(result.current.updateState.error).toBe('')
		})

		it('should set loading then error on API error', async () => {
			vi.mocked(levelApi.updateLevel).mockResolvedValueOnce({
				data: null,
				error: 'Error al actualizar nivel',
			})

			const { result } = renderHook(() => useLevelMutations())

			await act(async () => {
				await result.current.updateLevel(1, { name: 'Test' })
			})

			await waitFor(() => {
				expect(result.current.updateState.status).toBe('error')
			})

			expect(result.current.updateState.error).toBe(
				'Error al actualizar nivel'
			)
			expect(result.current.updateState.data).toBeUndefined()
		})

		it('should pass correct data to API', async () => {
			vi.mocked(levelApi.updateLevel).mockResolvedValueOnce({
				data: createMockLevel(),
			})

			const { result } = renderHook(() => useLevelMutations())

			const data = { name: 'Nivel Actualizado', status: false }

			await act(async () => {
				await result.current.updateLevel(42, data)
			})

			expect(levelApi.updateLevel).toHaveBeenCalledWith(42, data)
		})
	})

	describe('deleteLevel', () => {
		it('should set loading then success on success', async () => {
			vi.mocked(levelApi.deleteLevel).mockResolvedValueOnce({
				data: undefined,
			})

			const { result } = renderHook(() => useLevelMutations())

			await act(async () => {
				await result.current.deleteLevel(1)
			})

			await waitFor(() => {
				expect(result.current.deleteState.status).toBe('success')
			})

			expect(result.current.deleteState.error).toBe('')
		})

		it('should set loading then error on API error', async () => {
			vi.mocked(levelApi.deleteLevel).mockResolvedValueOnce({
				data: null,
				error: 'Error al eliminar nivel',
			})

			const { result } = renderHook(() => useLevelMutations())

			await act(async () => {
				await result.current.deleteLevel(1)
			})

			await waitFor(() => {
				expect(result.current.deleteState.status).toBe('error')
			})

			expect(result.current.deleteState.error).toBe(
				'Error al eliminar nivel'
			)
		})

		it('should pass correct ID to API', async () => {
			vi.mocked(levelApi.deleteLevel).mockResolvedValueOnce({
				data: undefined,
			})

			const { result } = renderHook(() => useLevelMutations())

			await act(async () => {
				await result.current.deleteLevel(42)
			})

			expect(levelApi.deleteLevel).toHaveBeenCalledWith(42)
		})
	})

	describe('independent state management', () => {
		it('should maintain separate states for each mutation', async () => {
			vi.mocked(levelApi.createLevel).mockResolvedValueOnce({
				data: createMockLevel(),
			})

			const { result } = renderHook(() => useLevelMutations())

			await act(async () => {
				await result.current.createLevel({
					code: 'LEVEL001',
					name: 'Nuevo Nivel',
					typeLevel: 'MMS',
					color: '#1A73E8',
					status: true,
				})
			})

			await waitFor(() => {
				expect(result.current.createState.status).toBe('success')
			})

			expect(result.current.updateState.status).toBe('idle')
			expect(result.current.deleteState.status).toBe('idle')
		})
	})
})
