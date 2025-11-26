import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '../client'

// Mock global fetch
global.fetch = vi.fn()

describe('ApiClient', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('get', () => {
		it('should make a GET request and return JSON data', async () => {
			const mockData = { users: [{ id: 1, name: 'Test' }] }
			;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => mockData,
			})

			const result = await apiClient.get('/users')

			expect(fetch).toHaveBeenCalledWith('/api/users', {
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
			})
			expect(result).toEqual(mockData)
		})

		it('should throw an error when response is not ok', async () => {
			;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: false,
				json: async () => ({ error: 'Not found' }),
			})

			await expect(apiClient.get('/users')).rejects.toThrow('Not found')
		})
	})

	describe('post', () => {
		it('should make a POST request with data', async () => {
			const mockData = { id: 1, name: 'Created' }
			const requestData = { name: 'Test' }
			;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => mockData,
			})

			const result = await apiClient.post('/users', requestData)

			expect(fetch).toHaveBeenCalledWith('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestData),
				credentials: 'include',
			})
			expect(result).toEqual(mockData)
		})
	})

	describe('put', () => {
		it('should make a PUT request with data', async () => {
			const mockData = { id: 1, name: 'Updated' }
			const requestData = { name: 'Updated Name' }
			;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => mockData,
			})

			const result = await apiClient.put('/users/1', requestData)

			expect(fetch).toHaveBeenCalledWith('/api/users/1', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(requestData),
				credentials: 'include',
			})
			expect(result).toEqual(mockData)
		})
	})

	describe('delete', () => {
		it('should make a DELETE request', async () => {
			;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ success: true }),
			})

			const result = await apiClient.delete('/users/1')

			expect(fetch).toHaveBeenCalledWith('/api/users/1', {
				method: 'DELETE',
				credentials: 'include',
			})
			expect(result).toEqual({ success: true })
		})
	})
})
