import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadFileApi } from '../lib/load-file-api'

describe('loadFileApi.getImportHistory — status query (REQ-6)', () => {
	const okJsonBody = JSON.stringify({
		data: {
			items: [],
			pagination: {
				page: 1,
				pageSize: 0,
				totalItems: 0,
				totalPages: 1,
			},
		},
	})

	beforeEach(() => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				text: () => Promise.resolve(okJsonBody),
			})
		)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('sets status=LOAD,PRE-SETTLED when filters.statuses is multi-value', async () => {
		await loadFileApi.getImportHistory(1, 100, {
			statuses: ['LOAD', 'PRE-SETTLED'],
		})

		expect(fetch).toHaveBeenCalledTimes(1)
		const urlArg = vi.mocked(fetch).mock.calls[0][0] as string
		const url = new URL(urlArg, 'http://localhost')
		expect(url.searchParams.get('status')).toBe('LOAD,PRE-SETTLED')
	})

	it('returns a clear error when the server returns HTML instead of JSON', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				text: () =>
					Promise.resolve('<!DOCTYPE html><html><body>Error</body></html>'),
			})
		)

		const result = await loadFileApi.getImportHistory(1, 100)

		expect(result.data).toBeNull()
		if ('error' in result && result.error) {
			expect(result.error).toContain('página web')
		} else {
			expect.fail('expected error branch')
		}
	})
})
