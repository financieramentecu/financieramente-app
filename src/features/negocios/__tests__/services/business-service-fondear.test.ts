import { describe, it, expect, vi, beforeEach } from 'vitest'
import { businessService } from '@/features/negocios/services/business.service'

describe('businessService.fondear', () => {
	const mockFetch = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		global.fetch = mockFetch
	})

	it('sends POST without a body when fundedDate is not provided (backward compatible)', async () => {
		mockFetch.mockResolvedValueOnce({
			json: () => Promise.resolve({ data: { id: 1 } }),
		})

		await businessService.fondear(1)

		expect(mockFetch).toHaveBeenCalledWith(
			'/api/negocios/1/fondear',
			expect.not.objectContaining({ body: expect.anything() })
		)
	})

	it('sends fundedDate in the JSON body when provided', async () => {
		mockFetch.mockResolvedValueOnce({
			json: () => Promise.resolve({ data: { id: 1 } }),
		})

		await businessService.fondear(1, '2026-06-15')

		expect(mockFetch).toHaveBeenCalledWith(
			'/api/negocios/1/fondear',
			expect.objectContaining({
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fundedDate: '2026-06-15' }),
			})
		)
	})
})
