import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useDistribucionComision } from '../hooks/use-distribucion-comision'
import type { DistribucionComision } from '../types/types'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

function makeDistribucion(
	overrides: Partial<DistribucionComision> = {}
): DistribucionComision {
	return {
		idSettlementCommission: 10,
		categoria: 'CARTERA',
		producto: 'Seguro de Vida',
		origen: 'DIRECTO',
		nombreAsesor: 'Juan Pérez',
		distribuciones: [
			{
				idComissionDistribution: 1,
				categoria: 'GENERAL',
				porcentajeDistribucion: 0.5,
				comisionBruta: 1000,
				comisionNeta: 880,
				totalDescuento: 120,
				porcentajeDescuento: 0.12,
				value_commission_final: 880,
				value_clawback_percentage: 0,
				clawback: null,
			},
		],
		...overrides,
	}
}

function mockJsonResponse(body: unknown, status = 200) {
	return Promise.resolve({
		ok: status >= 200 && status < 300,
		status,
		headers: { get: () => 'application/json' },
		json: () => Promise.resolve(body),
	})
}

describe('useDistribucionComision', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('stays idle and does not fetch when id is null', () => {
		const { result } = renderHook(() => useDistribucionComision(null))

		expect(mockFetch).not.toHaveBeenCalled()
		expect(result.current.distribucion).toBeNull()
		expect(result.current.isLoading).toBe(false)
		expect(result.current.error).toBeNull()
	})

	it('stays idle and does not fetch when id is 0 or negative', () => {
		const { result } = renderHook(() => useDistribucionComision(0))

		expect(mockFetch).not.toHaveBeenCalled()
		expect(result.current.distribucion).toBeNull()
		expect(result.current.isLoading).toBe(false)
	})

	it('transitions to loading state while fetch is in progress', async () => {
		let resolvePromise!: (value: unknown) => void
		mockFetch.mockReturnValue(
			new Promise((resolve) => {
				resolvePromise = resolve
			})
		)

		const { result } = renderHook(() => useDistribucionComision(10))

		await waitFor(() => {
			expect(result.current.isLoading).toBe(true)
		})

		// Resolve to avoid dangling promise
		resolvePromise(
			mockJsonResponse({ data: { distribucion: makeDistribucion() } })
		)
	})

	it('fetches from the correct URL', async () => {
		mockFetch.mockResolvedValue(
			mockJsonResponse({ data: { distribucion: makeDistribucion() } })
		)

		renderHook(() => useDistribucionComision(42))

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/pre-liquidacion/distribucion/42'
			)
		})
	})

	it('transitions from loading to success and returns distribucion', async () => {
		const distribucion = makeDistribucion()
		mockFetch.mockResolvedValue(
			mockJsonResponse({ data: { distribucion } })
		)

		const { result } = renderHook(() => useDistribucionComision(10))

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.error).toBeNull()
		expect(result.current.distribucion).not.toBeNull()
		expect(result.current.distribucion!.idSettlementCommission).toBe(10)
		expect(result.current.distribucion!.nombreAsesor).toBe('Juan Pérez')
		expect(result.current.distribucion!.distribuciones).toHaveLength(1)
	})

	it('transitions to error state when response is not ok (404)', async () => {
		mockFetch.mockResolvedValue(
			mockJsonResponse({ data: null, error: 'Distribución no encontrada' }, 404)
		)

		const { result } = renderHook(() => useDistribucionComision(999))

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.error).toBe('Distribución no encontrada')
		expect(result.current.distribucion).toBeNull()
	})

	it('transitions to error state when fetch throws (network error)', async () => {
		mockFetch.mockRejectedValue(new Error('Network failure'))

		const { result } = renderHook(() => useDistribucionComision(10))

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.error).toBe('Network failure')
		expect(result.current.distribucion).toBeNull()
	})

	it('exposes a refetch function that re-triggers the fetch', async () => {
		const distribucion = makeDistribucion()
		mockFetch.mockResolvedValue(
			mockJsonResponse({ data: { distribucion } })
		)

		const { result } = renderHook(() => useDistribucionComision(10))

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(mockFetch).toHaveBeenCalledTimes(1)

		mockFetch.mockResolvedValue(
			mockJsonResponse({ data: { distribucion } })
		)
		await result.current.refetch()

		expect(mockFetch).toHaveBeenCalledTimes(2)
	})
})
