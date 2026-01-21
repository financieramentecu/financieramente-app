import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { businessService } from '../../services/business.service'
import { createMockBusiness, mockBusinessList } from '../fixtures/mock-business'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('businessService', () => {
	beforeEach(() => {
		mockFetch.mockClear()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('getAll', () => {
		it('should fetch businesses with default params', async () => {
			const mockResponse = {
				data: {
					businesses: mockBusinessList,
					pagination: { page: 1, pageSize: 10, total: 5, totalPages: 1 },
				},
			}
			mockFetch.mockResolvedValueOnce({
				json: () => Promise.resolve(mockResponse),
			})

			const result = await businessService.getAll()

			expect(mockFetch).toHaveBeenCalledWith('/api/negocios')
			expect(result.data?.businesses).toHaveLength(5)
		})

		it('should include query params in URL', async () => {
			mockFetch.mockResolvedValueOnce({
				json: () =>
					Promise.resolve({ data: { businesses: [], pagination: {} } }),
			})

			await businessService.getAll({
				page: 2,
				pageSize: 20,
				search: 'test',
			})

			expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('page=2'))
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('pageSize=20')
			)
			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('search=test')
			)
		})

		it('should handle fetch error', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'))

			const result = await businessService.getAll()

			expect(result.data).toBeNull()
			expect('error' in result).toBe(true)
		})
	})

	describe('getById', () => {
		it('should fetch business by ID', async () => {
			const mockBusiness = createMockBusiness({ id: 123 })
			mockFetch.mockResolvedValueOnce({
				json: () => Promise.resolve({ data: mockBusiness }),
			})

			const result = await businessService.getById(123)

			expect(mockFetch).toHaveBeenCalledWith('/api/negocios/123')
			expect(result.data?.id).toBe(123)
		})

		it('should handle not found', async () => {
			mockFetch.mockResolvedValueOnce({
				json: () =>
					Promise.resolve({ data: null, error: 'Negocio no encontrado' }),
			})

			const result = await businessService.getById(999)

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toBe('Negocio no encontrado')
		})
	})

	describe('update', () => {
		it('should update business with contract', async () => {
			const mockBusiness = createMockBusiness({
				id: 1,
				contract: 'PN0005678',
				status: 'EMITIDO',
			})
			mockFetch.mockResolvedValueOnce({
				json: () => Promise.resolve({ data: mockBusiness }),
			})

			const result = await businessService.update(1, { contract: 'PN0005678' })

			expect(mockFetch).toHaveBeenCalledWith('/api/negocios/1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ contract: 'PN0005678' }),
			})
			expect(result.data?.contract).toBe('PN0005678')
		})

		it('should handle duplicate contract error', async () => {
			mockFetch.mockResolvedValueOnce({
				json: () =>
					Promise.resolve({
						data: null,
						error: "El número de contrato 'PN0005678' ya está asignado",
					}),
			})

			const result = await businessService.update(1, { contract: 'PN0005678' })

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toContain('ya está asignado')
		})
	})

	describe('cancel', () => {
		it('should cancel business with reason', async () => {
			const mockBusiness = createMockBusiness({
				id: 1,
				status: 'CANCELADO',
			})
			mockFetch.mockResolvedValueOnce({
				json: () => Promise.resolve({ data: mockBusiness }),
			})

			const result = await businessService.cancel(1, {
				reason: 'Cliente solicitó cancelación por cambio de planes',
			})

			expect(mockFetch).toHaveBeenCalledWith('/api/negocios/1/cancel', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					reason: 'Cliente solicitó cancelación por cambio de planes',
				}),
			})
			expect(result.data?.status).toBe('CANCELADO')
		})

		it('should handle permission error', async () => {
			mockFetch.mockResolvedValueOnce({
				json: () =>
					Promise.resolve({
						data: null,
						error: 'No tiene permisos para cancelar negocios',
					}),
			})

			const result = await businessService.cancel(1, {
				reason: 'Motivo de prueba largo',
			})

			expect(result.data).toBeNull()
			expect('error' in result && result.error).toContain('permisos')
		})
	})

	describe('validateContract', () => {
		it('should return available when contract is unique', async () => {
			mockFetch.mockResolvedValueOnce({
				json: () => Promise.resolve({ data: { available: true } }),
			})

			const result = await businessService.validateContract('PN0009999')

			expect(mockFetch).toHaveBeenCalledWith(
				'/api/negocios/validate-contract?contract=PN0009999'
			)
			expect(result.data?.available).toBe(true)
		})

		it('should return not available with existing business ID', async () => {
			mockFetch.mockResolvedValueOnce({
				json: () =>
					Promise.resolve({
						data: { available: false, existingBusinessId: 5 },
					}),
			})

			const result = await businessService.validateContract('PN0005678')

			expect(result.data?.available).toBe(false)
			expect(result.data?.existingBusinessId).toBe(5)
		})

		it('should exclude business ID when provided', async () => {
			mockFetch.mockResolvedValueOnce({
				json: () => Promise.resolve({ data: { available: true } }),
			})

			await businessService.validateContract('PN0005678', 1)

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining('excludeBusinessId=1')
			)
		})
	})

	describe('getStats', () => {
		it('should fetch business statistics', async () => {
			const mockStats = {
				efectuados: {
					totalValue: 635000000,
					totalMonth: 50000000,
					totalLastMonth: 0,
					monthlyData: [{ month: '2024-01', totalValue: 50000000 }],
					growthPercentage: 21.01,
				},
				emitidos: {
					totalValue: 325000000,
					totalMonth: 25000000,
					totalLastMonth: 0,
					monthlyData: [{ month: '2024-01', totalValue: 25000000 }],
					growthPercentage: 18.34,
				},
			}
			mockFetch.mockResolvedValueOnce({
				json: () => Promise.resolve({ data: mockStats }),
			})

			const result = await businessService.getStats()

			expect(mockFetch).toHaveBeenCalledWith('/api/negocios/stats')
			expect(result.data?.efectuados.totalValue).toBe(635000000)
			expect(result.data?.emitidos.growthPercentage).toBe(18.34)
		})
	})
})
