import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useComisionesPreliquidadas } from '../hooks/use-comisiones-preliquidadas'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

function makeSuccessResponse(registros: unknown[] = []) {
	return {
		data: {
			archivo: {
				idFileImport: 5,
				nombreArchivo: 'TEST-POLIZA-2026',
				fileType: 'POLIZA',
				usuarioCargo: 'Jane Doe',
				fechaCarga: '2026-01-15',
				totalRegistros: 10,
				sincronizados: registros.length,
			},
			registros,
		},
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

describe('useComisionesPreliquidadas', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('initial state has empty registros and null archivo before fetch resolves', () => {
		mockFetch.mockReturnValue(new Promise(() => {}))

		const { result } = renderHook(() => useComisionesPreliquidadas(5))

		expect(result.current.registros).toEqual([])
		expect(result.current.archivo).toBeNull()
	})

	it('transitions to loading state while fetch is in progress', async () => {
		let resolvePromise!: (value: unknown) => void
		mockFetch.mockReturnValue(
			new Promise((resolve) => {
				resolvePromise = resolve
			})
		)

		const { result } = renderHook(() => useComisionesPreliquidadas(5))

		await waitFor(() => {
			expect(result.current.isLoading).toBe(true)
		})

		// Resolve to avoid dangling promise
		resolvePromise(mockJsonResponse(makeSuccessResponse([])))
	})

	it('fetches from /api/pre-liquidacion/pre-settled/[fileId] with the correct URL', async () => {
		mockFetch.mockResolvedValue(mockJsonResponse(makeSuccessResponse([])))

		renderHook(() => useComisionesPreliquidadas(42))

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				'/api/pre-liquidacion/pre-settled/42'
			)
		})
	})

	it('transitions from loading to success and returns data in AsyncState format', async () => {
		const registros = [
			{
				idSettlementCommission: 1,
				idBusiness: 10,
				contrato: 'CT-001',
				nombreAsesor: 'Agent One',
				tipo: 'BASE',
				monto: 500,
				baseComision: 500,
				porcentajeDescuento: 0.12,
				porcentajeClawback: 0,
				esClawback: false,
				esRezagado: false,
				fechaSincronizacion: null,
				fechaRezagado: null,
				fechaInicio: null,
				fechaFin: null,
			},
		]
		mockFetch.mockResolvedValue(mockJsonResponse(makeSuccessResponse(registros)))

		const { result } = renderHook(() => useComisionesPreliquidadas(5))

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.error).toBeNull()
		expect(result.current.registros).toHaveLength(1)
		expect(result.current.registros[0].idSettlementCommission).toBe(1)
		expect(result.current.archivo).not.toBeNull()
		expect(result.current.archivo!.idFileImport).toBe(5)
	})

	it('transitions to error state when response is not ok (403)', async () => {
		mockFetch.mockResolvedValue(
			mockJsonResponse({ data: null, error: 'Sin permisos' }, 403)
		)

		const { result } = renderHook(() => useComisionesPreliquidadas(5))

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.error).toBe('Sin permisos')
		expect(result.current.registros).toEqual([])
		expect(result.current.archivo).toBeNull()
	})

	it('transitions to error state when fetch throws (network error)', async () => {
		mockFetch.mockRejectedValue(new Error('Network failure'))

		const { result } = renderHook(() => useComisionesPreliquidadas(5))

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.error).toBe('Network failure')
		expect(result.current.registros).toEqual([])
	})

	it('stays idle and returns empty data when fileId is null', () => {
		const { result } = renderHook(() => useComisionesPreliquidadas(null))

		expect(mockFetch).not.toHaveBeenCalled()
		expect(result.current.registros).toEqual([])
		expect(result.current.archivo).toBeNull()
		expect(result.current.isLoading).toBe(false)
	})

	it('stays idle and returns empty data when fileId is 0 or negative', () => {
		const { result } = renderHook(() => useComisionesPreliquidadas(0))

		expect(mockFetch).not.toHaveBeenCalled()
		expect(result.current.registros).toEqual([])
	})
})
