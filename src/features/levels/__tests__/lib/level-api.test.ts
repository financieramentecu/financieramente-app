import { describe, it, expect, vi, beforeEach } from 'vitest'
import { levelApi } from '../../lib/level-api'
import {
	createMockLevel,
	createMockLevelListResponse,
} from '../fixtures/mock-level'

// Mock apiClient
vi.mock('@/lib/api/client', () => ({
	apiClient: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
	},
}))

import { apiClient } from '@/lib/api/client'

const mockGet = vi.mocked(apiClient.get)
const mockPost = vi.mocked(apiClient.post)
const mockPut = vi.mocked(apiClient.put)
const mockDelete = vi.mocked(apiClient.delete)

describe('level-api', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('getLevels', () => {
		it('should fetch levels successfully (happy path)', async () => {
			const mockResponse = createMockLevelListResponse()
			mockGet.mockResolvedValueOnce({ data: mockResponse })

			const result = await levelApi.getLevels()

			expect(result.data).toEqual(mockResponse)
			expect('error' in result).toBe(false)
		})

		it('should handle API error (apiClient throws)', async () => {
			mockGet.mockRejectedValueOnce(new Error('Error del servidor'))

			const result = await levelApi.getLevels()

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Error del servidor')
		})

		it('should handle unknown error', async () => {
			mockGet.mockRejectedValueOnce('Unknown error')

			const result = await levelApi.getLevels()

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe(
				'Error desconocido al obtener niveles'
			)
		})

		it('should pass search params correctly', async () => {
			mockGet.mockResolvedValueOnce({
				data: createMockLevelListResponse(),
			})

			await levelApi.getLevels({ search: 'test' })

			expect(mockGet).toHaveBeenCalledWith('/levels?search=test')
		})

		it('should pass typeLevel filter correctly', async () => {
			mockGet.mockResolvedValueOnce({
				data: createMockLevelListResponse(),
			})

			await levelApi.getLevels({ typeLevel: 'MMS' })

			expect(mockGet).toHaveBeenCalledWith('/levels?typeLevel=MMS')
		})

		it('should pass status filter correctly', async () => {
			mockGet.mockResolvedValueOnce({
				data: createMockLevelListResponse(),
			})

			await levelApi.getLevels({ status: 'active' })

			expect(mockGet).toHaveBeenCalledWith('/levels?status=active')
		})

		it('should pass pagination params correctly', async () => {
			mockGet.mockResolvedValueOnce({
				data: createMockLevelListResponse(),
			})

			await levelApi.getLevels({ page: 2, pageSize: 20 })

			expect(mockGet).toHaveBeenCalledWith('/levels?page=2&pageSize=20')
		})

		it('should combine multiple filters correctly', async () => {
			mockGet.mockResolvedValueOnce({
				data: createMockLevelListResponse(),
			})

			await levelApi.getLevels({
				search: 'test',
				typeLevel: 'MMS',
				status: 'active',
				page: 1,
				pageSize: 10,
			})

			const url = mockGet.mock.calls[0][0] as string
			expect(url).toContain('search=test')
			expect(url).toContain('typeLevel=MMS')
			expect(url).toContain('status=active')
			expect(url).toContain('page=1')
			expect(url).toContain('pageSize=10')
		})
	})

	describe('getLevel', () => {
		it('should fetch single level successfully (happy path)', async () => {
			const mockLevel = createMockLevel()
			mockGet.mockResolvedValueOnce({ data: mockLevel })

			const result = await levelApi.getLevel(1)

			expect(result.data).toEqual(mockLevel)
			expect('error' in result).toBe(false)
		})

		it('should handle 404 error (level not found)', async () => {
			mockGet.mockRejectedValueOnce(new Error('Nivel no encontrado'))

			const result = await levelApi.getLevel(999)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Nivel no encontrado')
		})

		it('should handle network error', async () => {
			mockGet.mockRejectedValueOnce(new Error('Network error'))

			const result = await levelApi.getLevel(1)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})
	})

	describe('createLevel', () => {
		it('should create level successfully (happy path)', async () => {
			const mockLevel = createMockLevel()
			mockPost.mockResolvedValueOnce({ data: mockLevel })

			const result = await levelApi.createLevel({
				code: 'LEVEL001',
				name: 'Nuevo Nivel',
				typeLevel: 'MMS',
				color: '#1A73E8',
				status: true,
			})

			expect(result.data).toEqual(mockLevel)
			expect('error' in result).toBe(false)
		})

		it('should handle validation error (Zod)', async () => {
			mockPost.mockRejectedValueOnce(new Error('Datos inválidos'))

			const result = await levelApi.createLevel({
				code: '',
				name: 'A',
				typeLevel: 'MMS',
				color: '#1A73E8',
				status: true,
			})

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Datos inválidos')
		})

		it('should handle duplicate code error (409)', async () => {
			mockPost.mockRejectedValueOnce(
				new Error('Ya existe un nivel con este código')
			)

			const result = await levelApi.createLevel({
				code: 'LEVEL001',
				name: 'Nivel',
				typeLevel: 'MMS',
				color: '#1A73E8',
				status: true,
			})

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe(
				'Ya existe un nivel con este código'
			)
		})

		it('should handle network error', async () => {
			mockPost.mockRejectedValueOnce(new Error('Network error'))

			const result = await levelApi.createLevel({
				code: 'LEVEL001',
				name: 'Nuevo Nivel',
				typeLevel: 'MMS',
				color: '#1A73E8',
				status: true,
			})

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})

		it('should call apiClient.post with correct arguments', async () => {
			mockPost.mockResolvedValueOnce({ data: createMockLevel() })

			const input = {
				code: 'LEVEL001',
				name: 'Nuevo Nivel',
				typeLevel: 'MMS' as const,
				descripcion: 'Descripción',
				color: '#1A73E8',
				status: true,
			}

			await levelApi.createLevel(input)

			expect(mockPost).toHaveBeenCalledWith('/levels', input)
		})
	})

	describe('updateLevel', () => {
		it('should update level successfully (happy path)', async () => {
			const mockLevel = createMockLevel({ name: 'Nivel Actualizado' })
			mockPut.mockResolvedValueOnce({ data: mockLevel })

			const result = await levelApi.updateLevel(1, {
				name: 'Nivel Actualizado',
			})

			expect(result.data).toEqual(mockLevel)
			expect('error' in result).toBe(false)
		})

		it('should handle validation error (Zod)', async () => {
			mockPut.mockRejectedValueOnce(new Error('Datos inválidos'))

			const result = await levelApi.updateLevel(1, { name: 'A' })

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Datos inválidos')
		})

		it('should handle 404 error (level not found)', async () => {
			mockPut.mockRejectedValueOnce(new Error('Nivel no encontrado'))

			const result = await levelApi.updateLevel(999, { name: 'Test' })

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Nivel no encontrado')
		})

		it('should handle duplicate code error (409)', async () => {
			mockPut.mockRejectedValueOnce(
				new Error('Ya existe un nivel con este código')
			)

			const result = await levelApi.updateLevel(1, { code: 'LEVEL002' })

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe(
				'Ya existe un nivel con este código'
			)
		})

		it('should handle network error', async () => {
			mockPut.mockRejectedValueOnce(new Error('Network error'))

			const result = await levelApi.updateLevel(1, { name: 'Test' })

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})

		it('should call apiClient.put with correct arguments', async () => {
			mockPut.mockResolvedValueOnce({ data: createMockLevel() })

			const input = { name: 'Nivel Actualizado', status: false }

			await levelApi.updateLevel(1, input)

			expect(mockPut).toHaveBeenCalledWith('/levels/1', input)
		})
	})

	describe('deleteLevel', () => {
		it('should delete level successfully (happy path)', async () => {
			mockDelete.mockResolvedValueOnce({})

			const result = await levelApi.deleteLevel(1)

			expect('error' in result).toBe(false)
		})

		it('should handle 404 error (level not found)', async () => {
			mockDelete.mockRejectedValueOnce(new Error('Nivel no encontrado'))

			const result = await levelApi.deleteLevel(999)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Nivel no encontrado')
		})

		it('should handle foreign key constraint error', async () => {
			mockDelete.mockRejectedValueOnce(
				new Error(
					'No se puede eliminar el nivel porque tiene usuarios asignados'
				)
			)

			const result = await levelApi.deleteLevel(1)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe(
				'No se puede eliminar el nivel porque tiene usuarios asignados'
			)
		})

		it('should handle network error', async () => {
			mockDelete.mockRejectedValueOnce(new Error('Network error'))

			const result = await levelApi.deleteLevel(1)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})
	})

	describe('deactivateLevel', () => {
		it('should deactivate level successfully (happy path)', async () => {
			const mockLevel = createMockLevel({ status: false })
			mockPut.mockResolvedValueOnce({ data: mockLevel })

			const result = await levelApi.deactivateLevel(1)

			expect(result.data).toEqual(mockLevel)
			expect('error' in result).toBe(false)
			expect(mockPut).toHaveBeenCalledWith('/levels/1', { status: false })
		})

		it('should handle 404 error (level not found)', async () => {
			mockPut.mockRejectedValueOnce(new Error('Nivel no encontrado'))

			const result = await levelApi.deactivateLevel(999)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Nivel no encontrado')
		})

		it('should handle network error', async () => {
			mockPut.mockRejectedValueOnce(new Error('Network error'))

			const result = await levelApi.deactivateLevel(1)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Network error')
		})

		it('should handle unknown error', async () => {
			mockPut.mockRejectedValueOnce('Unknown error')

			const result = await levelApi.deactivateLevel(1)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe(
				'Error desconocido al desactivar nivel'
			)
		})
	})
})
