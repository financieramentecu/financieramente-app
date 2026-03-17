import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFileHistory } from '../hooks/use-file-history'
import { loadFileApi } from '../lib/load-file-api'

vi.mock('../lib/load-file-api', () => ({
	loadFileApi: {
		getImportHistory: vi.fn(),
	},
}))

const mockGetImportHistory = vi.mocked(loadFileApi.getImportHistory)

const makeMockItem = (overrides = {}) => ({
	idFileImport: 1,
	nameFile: 'SINCRONIZACION-POLIZA-FEBRERO-2026',
	fileType: 'POLIZA',
	totalRecord: 100,
	successRecord: 90,
	errorRecord: 10,
	sincronizadoRecord: 80,
	rezagadoRecord: 5,
	noSincronizadoRecord: 5,
	status: 'COMPLETED',
	createdAt: new Date('2026-02-01T10:00:00Z'),
	month: 2,
	year: 2026,
	user: { name: 'John', lastName: 'Doe' },
	...overrides,
})

const makePaginatedResponse = (items: ReturnType<typeof makeMockItem>[]) => ({
	data: {
		items,
		pagination: {
			page: 1,
			pageSize: items.length,
			totalItems: items.length,
			totalPages: 1,
		},
	},
})

describe('useFileHistory — AsyncState lifecycle', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('initial state is idle before fetch resolves', () => {
		// Never resolves so we can inspect initial state
		mockGetImportHistory.mockReturnValue(new Promise(() => {}))

		const { result } = renderHook(() => useFileHistory())

		// On first render, useEffect has not yet run to completion
		// historial is [] (derived from idle), isLoading starts as false initially
		// but after first render the effect fires and transitions to loading
		expect(result.current.historial).toEqual([])
		expect(result.current.error).toBeNull()
	})

	it('transitions to loading when fetchHistorial is called', async () => {
		// Keep promise pending
		let resolvePromise!: (value: ReturnType<typeof makePaginatedResponse>) => void
		mockGetImportHistory.mockReturnValue(
			new Promise((resolve) => {
				resolvePromise = resolve
			})
		)

		const { result } = renderHook(() => useFileHistory())

		// After the effect fires the state becomes loading
		await waitFor(() => {
			expect(result.current.isLoading).toBe(true)
		})

		// Resolve to avoid dangling promise
		resolvePromise(makePaginatedResponse([]))
	})

	it('resolves to success with data when getImportHistory resolves', async () => {
		const items = [makeMockItem(), makeMockItem({ idFileImport: 2 })]
		mockGetImportHistory.mockResolvedValueOnce(makePaginatedResponse(items))

		const { result } = renderHook(() => useFileHistory())

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
			expect(result.current.historial).toHaveLength(2)
		})

		expect(result.current.error).toBeNull()
		expect(result.current.historial[0].id).toBe('1')
		expect(result.current.historial[0].nombreArchivo).toBe(
			'SINCRONIZACION-POLIZA-FEBRERO-2026'
		)
	})

	it('resolves to error with message when getImportHistory rejects', async () => {
		mockGetImportHistory.mockRejectedValueOnce(
			new Error('Network error')
		)

		const { result } = renderHook(() => useFileHistory())

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
			expect(result.current.error).toBe('Network error')
		})

		expect(result.current.historial).toEqual([])
	})

	it('resolves to error when response contains error field', async () => {
		mockGetImportHistory.mockResolvedValueOnce({
			data: null,
			error: 'Unauthorized',
		})

		const { result } = renderHook(() => useFileHistory())

		await waitFor(() => {
			expect(result.current.error).toBe('Unauthorized')
		})
	})

	it('derived value historial is [] when state is not success', async () => {
		mockGetImportHistory.mockRejectedValueOnce(new Error('fail'))

		const { result } = renderHook(() => useFileHistory())

		await waitFor(() => expect(result.current.error).toBeTruthy())

		expect(result.current.historial).toEqual([])
	})

	it('derived value isLoading is false when state is success', async () => {
		mockGetImportHistory.mockResolvedValueOnce(makePaginatedResponse([]))

		const { result } = renderHook(() => useFileHistory())

		await waitFor(() => expect(result.current.isLoading).toBe(false))

		expect(result.current.historial).toEqual([])
		expect(result.current.error).toBeNull()
	})
})
