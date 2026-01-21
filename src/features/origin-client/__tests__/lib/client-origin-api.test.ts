import { describe, it, expect, vi, beforeEach } from 'vitest'
import { clientOriginApi } from '../../lib/client-origin-api'
import type {
	ClientOrigin,
	ClientOriginListResponse,
} from '../../types/client-origin.types'

// Mock global fetch
global.fetch = vi.fn()

const createMockClientOrigin = (
	overrides?: Partial<ClientOrigin>
): ClientOrigin => ({
	idClientOrigin: 1,
	name: 'Propio',
	description: 'Origen propio',
	status: true,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
	...overrides,
})

const createMockClientOriginListResponse = (
	origins: ClientOrigin[] = [createMockClientOrigin()]
): ClientOriginListResponse => ({
	origins,
	pagination: {
		page: 1,
		pageSize: 10,
		total: origins.length,
		totalPages: Math.ceil(origins.length / 10),
	},
})

describe('clientOriginApi', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('getClientOrigins', () => {
		it('should fetch client origins successfully (happy path)', async () => {
			const mockResponse = createMockClientOriginListResponse([
				createMockClientOrigin({ idClientOrigin: 1, name: 'Propio' }),
				createMockClientOrigin({ idClientOrigin: 2, name: 'Referido' }),
			])

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockResponse }),
			} as Response)

			const result = await clientOriginApi.getClientOrigins()

			expect(result).toEqual({ data: mockResponse })
			expect(fetch).toHaveBeenCalledWith('/api/origins', {
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			})
		})

		it('should fetch client origins with search params', async () => {
			const mockResponse = createMockClientOriginListResponse()
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockResponse }),
			} as Response)

			await clientOriginApi.getClientOrigins({
				search: 'Propio',
				page: 1,
				pageSize: 10,
			})

			expect(fetch).toHaveBeenCalledWith(
				'/api/origins?search=Propio&page=1&pageSize=10',
				expect.any(Object)
			)
		})

		it('should handle API error response', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					data: null,
					error: 'Error al obtener orígenes de cliente',
				}),
			} as Response)

			const result = await clientOriginApi.getClientOrigins()

			expect(result).toEqual({
				data: null,
				error: 'Error al obtener orígenes de cliente',
			})
		})

		it('should handle network error', async () => {
			vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

			const result = await clientOriginApi.getClientOrigins()

			expect(result).toEqual({
				data: null,
				error: 'Network error',
			})
		})
	})

	describe('getClientOrigin', () => {
		it('should fetch single client origin successfully', async () => {
			const mockOrigin = createMockClientOrigin()

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockOrigin }),
			} as Response)

			const result = await clientOriginApi.getClientOrigin(1)

			expect(result).toEqual({ data: mockOrigin })
			expect(fetch).toHaveBeenCalledWith('/api/origins/1', {
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			})
		})

		it('should handle API error response', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					data: null,
					error: 'Origen de cliente no encontrado',
				}),
			} as Response)

			const result = await clientOriginApi.getClientOrigin(999)

			expect(result).toEqual({
				data: null,
				error: 'Origen de cliente no encontrado',
			})
		})
	})

	describe('createClientOrigin', () => {
		it('should create client origin successfully', async () => {
			const mockOrigin = createMockClientOrigin()
			const createData = {
				name: 'Propio',
				description: 'Origen propio',
				status: true,
			}

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockOrigin }),
			} as Response)

			const result = await clientOriginApi.createClientOrigin(createData)

			expect(result).toEqual({ data: mockOrigin })
			expect(fetch).toHaveBeenCalledWith('/api/origins', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(createData),
				credentials: 'include',
			})
		})

		it('should handle API error response', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					data: null,
					error: 'Ya existe un origen con este nombre',
				}),
			} as Response)

			const result = await clientOriginApi.createClientOrigin({
				name: 'Propio',
			})

			expect(result).toEqual({
				data: null,
				error: 'Ya existe un origen con este nombre',
			})
		})
	})

	describe('updateClientOrigin', () => {
		it('should update client origin successfully', async () => {
			const mockOrigin = createMockClientOrigin({ name: 'Actualizado' })
			const updateData = {
				name: 'Actualizado',
			}

			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: mockOrigin }),
			} as Response)

			const result = await clientOriginApi.updateClientOrigin(1, updateData)

			expect(result).toEqual({ data: mockOrigin })
			expect(fetch).toHaveBeenCalledWith('/api/origins/1', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(updateData),
				credentials: 'include',
			})
		})
	})

	describe('deleteClientOrigin', () => {
		it('should delete client origin successfully', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ data: undefined }),
			} as Response)

			const result = await clientOriginApi.deleteClientOrigin(1)

			expect(result).toEqual({ data: undefined })
			expect(fetch).toHaveBeenCalledWith('/api/origins/1', {
				method: 'DELETE',
				credentials: 'include',
			})
		})

		it('should handle API error response', async () => {
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					data: null,
					error: 'Este origen tiene negocios asociados',
				}),
			} as Response)

			const result = await clientOriginApi.deleteClientOrigin(1)

			expect(result).toEqual({
				data: null,
				error: 'Este origen tiene negocios asociados',
			})
		})
	})
})
