import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBusinessStats } from '../../hooks/use-business-stats'
import { businessService } from '../../services/business.service'

vi.mock('../../services/business.service', () => ({
	businessService: {
		getStats: vi.fn(),
	},
}))

describe('useBusinessStats', () => {
	const mockCurrencies = [
		{ symbol: 'COP', name: 'Peso Colombiano' },
		{ symbol: 'USD', name: 'Dólar Americano' },
	]

	const mockStatusStats = {
		totalValue: 635000000,
		totalMonth: 60500000,
		totalLastMonth: 50000000,
		monthlyData: [
			{ month: '2024-01', totalValue: 50000000 },
			{ month: '2024-02', totalValue: 60500000 },
		],
		growthPercentage: 21.01,
	}

	const mockEmitidosStats = {
		totalValue: 325000000,
		totalMonth: 29585000,
		totalLastMonth: 25000000,
		monthlyData: [
			{ month: '2024-01', totalValue: 25000000 },
			{ month: '2024-02', totalValue: 29585000 },
		],
		growthPercentage: 18.34,
	}

	const mockStats = {
		currencies: mockCurrencies,
		efectuados: {
			COP: mockStatusStats,
			USD: { ...mockStatusStats, totalValue: 100000 },
		},
		emitidos: {
			COP: mockEmitidosStats,
			USD: { ...mockEmitidosStats, totalValue: 50000 },
		},
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('Happy Path', () => {
		it('should fetch and return stats', async () => {
			vi.mocked(businessService.getStats).mockResolvedValueOnce({
				data: mockStats,
			})

			const { result } = renderHook(() => useBusinessStats())

			expect(result.current.isLoading).toBe(true)

			await waitFor(() => {
				expect(result.current.isLoading).toBe(false)
			})

			expect(result.current.stats).toEqual(mockStats)
			expect(result.current.stats?.efectuados.COP.growthPercentage).toBe(21.01)
		})

		it('should have correct initial state', () => {
			vi.mocked(businessService.getStats).mockResolvedValueOnce({
				data: mockStats,
			})

			const { result } = renderHook(() => useBusinessStats())

			expect(result.current.isLoading).toBe(true)
			expect(result.current.stats).toBeNull()
			expect(result.current.error).toBeNull()
		})

		it('should return both efectuados and emitidos stats grouped by currency', async () => {
			vi.mocked(businessService.getStats).mockResolvedValueOnce({
				data: mockStats,
			})

			const { result } = renderHook(() => useBusinessStats())

			await waitFor(() => {
				expect(result.current.stats).not.toBeNull()
			})

			expect(result.current.stats?.currencies).toBeDefined()
			expect(result.current.stats?.efectuados).toBeDefined()
			expect(result.current.stats?.emitidos).toBeDefined()
			expect(result.current.stats?.efectuados.COP.totalValue).toBe(635000000)
			expect(result.current.stats?.emitidos.COP.totalValue).toBe(325000000)
		})

		it('should include monthly data in stats', async () => {
			vi.mocked(businessService.getStats).mockResolvedValueOnce({
				data: mockStats,
			})

			const { result } = renderHook(() => useBusinessStats())

			await waitFor(() => {
				expect(result.current.stats).not.toBeNull()
			})

			expect(result.current.stats?.efectuados.COP.monthlyData).toHaveLength(2)
			expect(result.current.stats?.efectuados.COP.monthlyData[0].month).toBe(
				'2024-01'
			)
		})

		it('should include currencies list', async () => {
			vi.mocked(businessService.getStats).mockResolvedValueOnce({
				data: mockStats,
			})

			const { result } = renderHook(() => useBusinessStats())

			await waitFor(() => {
				expect(result.current.stats).not.toBeNull()
			})

			expect(result.current.stats?.currencies).toHaveLength(2)
			expect(result.current.stats?.currencies[0].symbol).toBe('COP')
			expect(result.current.stats?.currencies[1].symbol).toBe('USD')
		})
	})

	describe('Flujos Alternos', () => {
		it('should handle API error', async () => {
			vi.mocked(businessService.getStats).mockResolvedValueOnce({
				data: null,
				error: 'Error al cargar estadísticas',
			})

			const { result } = renderHook(() => useBusinessStats())

			await waitFor(() => {
				expect(result.current.error).toBe('Error al cargar estadísticas')
			})

			expect(result.current.stats).toBeNull()
			expect(result.current.isLoading).toBe(false)
		})

		it('should handle network error', async () => {
			vi.mocked(businessService.getStats).mockRejectedValueOnce(
				new Error('Network error')
			)

			const { result } = renderHook(() => useBusinessStats())

			await waitFor(() => {
				expect(result.current.error).toBe('Error al cargar estadísticas')
			})

			expect(result.current.stats).toBeNull()
		})

		it('should allow refetch', async () => {
			const updatedStats = {
				...mockStats,
				efectuados: {
					...mockStats.efectuados,
					COP: { ...mockStats.efectuados.COP, totalValue: 700000000 },
				},
			}

			vi.mocked(businessService.getStats)
				.mockResolvedValueOnce({ data: mockStats })
				.mockResolvedValueOnce({ data: updatedStats })

			const { result } = renderHook(() => useBusinessStats())

			await waitFor(() => {
				expect(result.current.stats?.efectuados.COP.totalValue).toBe(635000000)
			})

			// Trigger refetch
			await result.current.refetch()

			await waitFor(() => {
				expect(result.current.stats?.efectuados.COP.totalValue).toBe(700000000)
			})
		})
	})

	describe('Growth Percentage', () => {
		it('should return positive growth', async () => {
			vi.mocked(businessService.getStats).mockResolvedValueOnce({
				data: mockStats,
			})

			const { result } = renderHook(() => useBusinessStats())

			await waitFor(() => {
				expect(result.current.stats?.efectuados.COP.growthPercentage).toBe(
					21.01
				)
			})
		})

		it('should handle zero growth', async () => {
			const zeroGrowthStats = {
				...mockStats,
				efectuados: {
					...mockStats.efectuados,
					COP: { ...mockStats.efectuados.COP, growthPercentage: 0 },
				},
			}

			vi.mocked(businessService.getStats).mockResolvedValueOnce({
				data: zeroGrowthStats,
			})

			const { result } = renderHook(() => useBusinessStats())

			await waitFor(() => {
				expect(result.current.stats?.efectuados.COP.growthPercentage).toBe(0)
			})
		})

		it('should handle negative growth', async () => {
			const negativeGrowthStats = {
				...mockStats,
				efectuados: {
					...mockStats.efectuados,
					COP: { ...mockStats.efectuados.COP, growthPercentage: -15.5 },
				},
			}

			vi.mocked(businessService.getStats).mockResolvedValueOnce({
				data: negativeGrowthStats,
			})

			const { result } = renderHook(() => useBusinessStats())

			await waitFor(() => {
				expect(result.current.stats?.efectuados.COP.growthPercentage).toBe(
					-15.5
				)
			})
		})
	})
})
