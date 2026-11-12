import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useNotifications } from '../use-notifications'

class FakeEventSource {
	static instances: FakeEventSource[] = []
	onerror: (() => void) | null = null
	constructor(public url: string) {
		FakeEventSource.instances.push(this)
	}
	addEventListener() {}
	close() {}
}

describe('useNotifications', () => {
	const fetchMock = vi.fn()

	beforeEach(() => {
		FakeEventSource.instances = []
		fetchMock.mockReset()
		fetchMock.mockResolvedValue({ ok: true, json: async () => [] })
		vi.stubGlobal('fetch', fetchMock)
		vi.stubGlobal('EventSource', FakeEventSource)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('does not fetch nor open the stream while the user id is unknown', () => {
		renderHook(() => useNotifications(0))

		expect(fetchMock).not.toHaveBeenCalled()
		expect(FakeEventSource.instances).toHaveLength(0)
	})

	it('fetches once and opens one stream when the user id is known', async () => {
		renderHook(() => useNotifications(7))

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
		expect(fetchMock).toHaveBeenCalledWith('/api/notifications')
		expect(FakeEventSource.instances).toHaveLength(1)
	})
})
