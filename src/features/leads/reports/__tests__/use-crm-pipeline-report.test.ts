import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useCrmPipelineReport } from '@/features/leads/reports/use-crm-pipeline-report'

const reportFor = (from: string, to: string) => ({ range: { from, to } })

function deferred<T>() {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((done) => (resolve = done))
	return { promise, resolve }
}

describe('useCrmPipelineReport', () => {
	beforeEach(() => vi.restoreAllMocks())

	it('loads the default range first and exposes the served range', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: reportFor('2026-08-12', '2026-11-09') }) })))
		const { result } = renderHook(() => useCrmPipelineReport())
		expect(result.current.state.status).toBe('loading')
		await waitFor(() => expect(result.current.state.status).toBe('success'))
		expect(result.current.range).toEqual({ from: '2026-08-12', to: '2026-11-09' })
	})

	it('ignores a slower, older response', async () => {
		const slow = deferred<unknown>()
		const fetchMock = vi
			.fn()
			.mockReturnValueOnce(slow.promise)
			.mockResolvedValueOnce({ ok: true, json: async () => ({ data: reportFor('2026-10-01', '2026-10-31') }) })
		vi.stubGlobal('fetch', fetchMock)
		const { result } = renderHook(() => useCrmPipelineReport())

		await act(() => result.current.load({ from: '2026-10-01', to: '2026-10-31' }))
		await act(async () => slow.resolve({ ok: true, json: async () => ({ data: reportFor('2026-01-01', '2026-01-31') }) }))

		expect(result.current.range).toEqual({ from: '2026-10-01', to: '2026-10-31' })
	})

	it('surfaces the server error message', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({ data: null, error: 'El reporte supera 20.000 leads' }) })))
		const { result } = renderHook(() => useCrmPipelineReport())
		await waitFor(() => expect(result.current.state).toEqual({ status: 'error', data: undefined, error: 'El reporte supera 20.000 leads' }))
	})
})
