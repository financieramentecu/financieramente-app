import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useLeadDetailSheet } from '@/features/leads/hooks/use-lead-detail-sheet'

describe('useLeadDetailSheet', () => {
	it('opens the sheet before the lead request finishes', async () => {
		let finish: (value: { ok: boolean; json: () => Promise<unknown> }) => void = () => undefined
		vi.stubGlobal(
			'fetch',
			vi.fn(
				() =>
					new Promise((resolve) => {
						finish = resolve
					})
			)
		)
		const { result } = renderHook(() => useLeadDetailSheet())

		act(() => {
			result.current.openLead(4, 'Camila Herrera')
		})

		expect(result.current.open).toBe(true)
		expect(result.current.lead).toBeNull()
		expect(result.current.previewName).toBe('Camila Herrera')
		expect(result.current.loadError).toBeNull()

		await act(async () => {
			finish({ ok: true, json: async () => ({ data: { idLead: 4, name: 'Camila' } }) })
		})
		await waitFor(() => expect(result.current.lead?.idLead).toBe(4))
	})

	it('reopens the same lead without requesting it again', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ data: { idLead: 4, name: 'Camila' } }),
		})
		vi.stubGlobal('fetch', fetchMock)
		const { result } = renderHook(() => useLeadDetailSheet())

		act(() => {
			result.current.openLead(4, 'Camila')
		})
		await waitFor(() => expect(result.current.lead?.idLead).toBe(4))

		act(() => {
			result.current.setOpen(false)
			result.current.openLead(4, 'Camila')
		})

		expect(result.current.open).toBe(true)
		expect(result.current.lead?.idLead).toBe(4)
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})
