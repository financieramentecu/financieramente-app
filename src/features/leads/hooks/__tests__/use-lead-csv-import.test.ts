import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLeadCsvImport } from '@/features/leads/hooks/use-lead-csv-import'
import { readWorkbookFromFile } from '@/features/load-file/lib/read-workbook'
import { parseLeadCsvFile } from '@/features/leads/lib/parse-lead-csv-file'

vi.mock('@/features/load-file/lib/read-workbook', () => ({
	readWorkbookFromFile: vi.fn(),
}))
vi.mock('@/features/leads/lib/parse-lead-csv-file', () => ({
	parseLeadCsvFile: vi.fn(),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const SUMMARY = {
	totalRows: 1,
	imported: 1,
	created: 1,
	updated: 0,
	rejected: [],
	ownerlessLeads: [],
	wonLockedLeads: [],
}

describe('useLeadCsvImport', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('starts idle', () => {
		const { result } = renderHook(() => useLeadCsvImport())
		expect(result.current.state.status).toBe('idle')
	})

	it('transitions idle -> loading -> success when the upload succeeds', async () => {
		vi.mocked(readWorkbookFromFile).mockResolvedValue({} as never)
		vi.mocked(parseLeadCsvFile).mockReturnValue({
			rejected: false,
			rows: [{ id_externo_crm: 'CRM-1' }],
		} as never)
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ data: SUMMARY }),
		})

		const { result } = renderHook(() => useLeadCsvImport())
		const file = new File(['content'], 'leads.csv', { type: 'text/csv' })

		await act(async () => {
			await result.current.importFile(file)
		})

		await waitFor(() => expect(result.current.state.status).toBe('success'))
		expect(result.current.state.data).toEqual(SUMMARY)
	})

	it('transitions idle -> loading -> error when the header check fails', async () => {
		vi.mocked(readWorkbookFromFile).mockResolvedValue({} as never)
		vi.mocked(parseLeadCsvFile).mockReturnValue({
			rejected: true,
			reason: 'Encabezados inválidos',
		} as never)

		const { result } = renderHook(() => useLeadCsvImport())
		const file = new File(['content'], 'leads.csv', { type: 'text/csv' })

		await act(async () => {
			await result.current.importFile(file)
		})

		await waitFor(() => expect(result.current.state.status).toBe('error'))
		expect(result.current.state.error).toContain('Encabezados inválidos')
	})

	it('transitions idle -> loading -> error on a non-2xx import response', async () => {
		vi.mocked(readWorkbookFromFile).mockResolvedValue({} as never)
		vi.mocked(parseLeadCsvFile).mockReturnValue({
			rejected: false,
			rows: [{ id_externo_crm: 'CRM-1' }],
		} as never)
		mockFetch.mockResolvedValue({
			ok: false,
			json: async () => ({ data: null, error: 'No autorizado' }),
		})

		const { result } = renderHook(() => useLeadCsvImport())
		const file = new File(['content'], 'leads.csv', { type: 'text/csv' })

		await act(async () => {
			await result.current.importFile(file)
		})

		await waitFor(() => expect(result.current.state.status).toBe('error'))
		expect(result.current.state.error).toBe('No autorizado')
	})
})
