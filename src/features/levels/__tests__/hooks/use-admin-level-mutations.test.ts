import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAdminLevelMutations } from '../../hooks/use-admin-level-mutations'
import { createMockLevel } from '../fixtures/mock-level'

vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}))

vi.mock('../../lib/level-api', () => ({
	levelApi: {
		createLevel: vi.fn(),
		updateLevel: vi.fn(),
		deactivateLevel: vi.fn(),
	},
}))

import { toast } from 'sonner'
import { levelApi } from '../../lib/level-api'

const mockCreateLevel = vi.mocked(levelApi.createLevel)
const mockUpdateLevel = vi.mocked(levelApi.updateLevel)
const mockDeactivateLevel = vi.mocked(levelApi.deactivateLevel)

describe('useAdminLevelMutations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('createLevel', () => {
		it('should create level and show success toast', async () => {
			const mockLevel = createMockLevel()
			mockCreateLevel.mockResolvedValueOnce({ data: mockLevel })

			const { result } = renderHook(() => useAdminLevelMutations())

			await act(async () => {
				await result.current.createLevel({
					code: 'LEVEL001',
					name: 'Test',
					typeLevel: 'MMS',
					color: '#1A73E8',
					status: true,
				})
			})

			expect(toast.success).toHaveBeenCalledWith('Nivel creado exitosamente')
			expect(result.current.isSubmitting).toBe(false)
		})

		it('should handle API error response and show error toast', async () => {
			mockCreateLevel.mockResolvedValueOnce({
				data: null,
				error: 'Datos inválidos',
			})

			const { result } = renderHook(() => useAdminLevelMutations())

			await expect(
				act(async () => {
					await result.current.createLevel({
						code: '',
						name: 'A',
						typeLevel: 'MMS',
						color: '#1A73E8',
						status: true,
					})
				})
			).rejects.toThrow('Datos inválidos')

			expect(toast.error).toHaveBeenCalledWith('Error al crear nivel', {
				description: 'Datos inválidos',
			})
		})
	})

	describe('updateLevel', () => {
		it('should update level and show success toast', async () => {
			const mockLevel = createMockLevel({ name: 'Updated' })
			mockUpdateLevel.mockResolvedValueOnce({ data: mockLevel })

			const { result } = renderHook(() => useAdminLevelMutations())

			await act(async () => {
				await result.current.updateLevel(1, { name: 'Updated' })
			})

			expect(toast.success).toHaveBeenCalledWith(
				'Nivel actualizado exitosamente'
			)
		})

		it('should handle API error response and show error toast', async () => {
			mockUpdateLevel.mockResolvedValueOnce({
				data: null,
				error: 'Nivel no encontrado',
			})

			const { result } = renderHook(() => useAdminLevelMutations())

			await expect(
				act(async () => {
					await result.current.updateLevel(999, { name: 'Test' })
				})
			).rejects.toThrow('Nivel no encontrado')

			expect(toast.error).toHaveBeenCalledWith(
				'Error al actualizar nivel',
				{ description: 'Nivel no encontrado' }
			)
		})
	})

	describe('deleteLevel', () => {
		it('should call deactivateLevel (soft delete) and show success toast', async () => {
			const mockLevel = createMockLevel({ status: false })
			mockDeactivateLevel.mockResolvedValueOnce({ data: mockLevel })

			const { result } = renderHook(() => useAdminLevelMutations())

			await act(async () => {
				await result.current.deleteLevel(1)
			})

			expect(mockDeactivateLevel).toHaveBeenCalledWith(1)
			expect(toast.success).toHaveBeenCalledWith(
				'Nivel desactivado exitosamente'
			)
		})

		it('should NOT call levelApi.deleteLevel (hard delete)', async () => {
			const mockLevel = createMockLevel({ status: false })
			mockDeactivateLevel.mockResolvedValueOnce({ data: mockLevel })

			const { result } = renderHook(() => useAdminLevelMutations())

			await act(async () => {
				await result.current.deleteLevel(1)
			})

			expect(mockDeactivateLevel).toHaveBeenCalledWith(1)
		})

		it('should handle API error response and show error toast', async () => {
			mockDeactivateLevel.mockResolvedValueOnce({
				data: null,
				error: 'Nivel no encontrado',
			})

			const { result } = renderHook(() => useAdminLevelMutations())

			await expect(
				act(async () => {
					await result.current.deleteLevel(999)
				})
			).rejects.toThrow('Nivel no encontrado')

			expect(toast.error).toHaveBeenCalledWith(
				'Error al desactivar nivel',
				{ description: 'Nivel no encontrado' }
			)
		})
	})
})
