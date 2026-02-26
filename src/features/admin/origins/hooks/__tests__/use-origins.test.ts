import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	useProductOrigins,
	useClientOrigins,
	useProductOriginMutations,
	useClientOriginMutations,
} from '../use-origins'
import { originApi } from '../../lib/origin-api'
import type {
	ProductOrigin,
	ClientOrigin,
	CreateProductOriginInput,
	UpdateProductOriginInput,
	CreateClientOriginInput,
	UpdateClientOriginInput,
} from '@/features/origins/types/origins.types'

// Mock originApi
vi.mock('../../lib/origin-api', () => ({
	originApi: {
		getProductOrigins: vi.fn(),
		getClientOrigins: vi.fn(),
		createProductOrigin: vi.fn(),
		updateProductOrigin: vi.fn(),
		deleteProductOrigin: vi.fn(),
		createClientOrigin: vi.fn(),
		updateClientOrigin: vi.fn(),
		deleteClientOrigin: vi.fn(),
	},
}))

describe('useProductOrigins', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should start with loading state', async () => {
		const mockOrigins: ProductOrigin[] = [
			{
				idOrigin: 1,
				name: 'Propio',
				description: null,
				status: true,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			},
		]

		vi.mocked(originApi.getProductOrigins).mockResolvedValueOnce(mockOrigins)

		const { result } = renderHook(() => useProductOrigins())

		// Initial state should be loading
		expect(result.current.state.status).toBe('loading')
		expect(result.current.state.data).toBeUndefined()

		// Wait for the effect to complete
		await waitFor(() => {
			expect(result.current.state.status).not.toBe('loading')
		})
	})

	it('should fetch product origins successfully (happy path)', async () => {
		const mockOrigins: ProductOrigin[] = [
			{
				idOrigin: 1,
				name: 'Propio',
				description: null,
				status: true,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			},
		]

		vi.mocked(originApi.getProductOrigins).mockResolvedValueOnce(mockOrigins)

		const { result } = renderHook(() => useProductOrigins())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockOrigins)
		expect(result.current.state.error).toBe('')
		expect(originApi.getProductOrigins).toHaveBeenCalledTimes(1)
	})

	it('should handle API error', async () => {
		vi.mocked(originApi.getProductOrigins).mockRejectedValueOnce(
			new Error('Network error')
		)

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { result } = renderHook(() => useProductOrigins())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Network error')
		expect(result.current.state.data).toBeUndefined()

		consoleError.mockRestore()
	})

	it('should provide refetch function', async () => {
		const mockOrigins: ProductOrigin[] = []
		vi.mocked(originApi.getProductOrigins).mockResolvedValue(mockOrigins)

		const { result } = renderHook(() => useProductOrigins())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(typeof result.current.refetch).toBe('function')

		// Call refetch
		await result.current.refetch()

		await waitFor(() => {
			expect(originApi.getProductOrigins).toHaveBeenCalledTimes(2)
		})
	})
})

describe('useClientOrigins', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should fetch client origins successfully (happy path)', async () => {
		const mockOrigins: ClientOrigin[] = [
			{
				idClientOrigin: 1,
				name: 'Referido',
				description: null,
				status: true,
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			},
		]

		vi.mocked(originApi.getClientOrigins).mockResolvedValueOnce(mockOrigins)

		const { result } = renderHook(() => useClientOrigins())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockOrigins)
		expect(result.current.state.error).toBe('')
	})

	it('should handle API error', async () => {
		vi.mocked(originApi.getClientOrigins).mockRejectedValueOnce(
			new Error('API error')
		)

		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { result } = renderHook(() => useClientOrigins())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('API error')

		consoleError.mockRestore()
	})
})

describe('useProductOriginMutations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should create product origin successfully', async () => {
		const mockInput: CreateProductOriginInput = {
			name: 'Nuevo Origen',
			description: 'Descripción',
			status: true,
		}

		const mockCreated: ProductOrigin = {
			idOrigin: 1,
			name: 'Nuevo Origen',
			description: 'Descripción',
			status: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		}

		vi.mocked(originApi.createProductOrigin).mockResolvedValueOnce(mockCreated)

		const { result } = renderHook(() => useProductOriginMutations())

		const createResult = await result.current.create(mockInput)

		expect(createResult.success).toBe(true)
		if (createResult.success) {
			expect(createResult.data).toEqual(mockCreated)
		}
		expect(originApi.createProductOrigin).toHaveBeenCalledWith(mockInput)
	})

	it('should handle create error', async () => {
		const mockInput: CreateProductOriginInput = {
			name: 'Nuevo Origen',
			status: true,
		}

		vi.mocked(originApi.createProductOrigin).mockRejectedValueOnce(
			new Error('Create failed')
		)

		const { result } = renderHook(() => useProductOriginMutations())

		const createResult = await result.current.create(mockInput)

		expect(createResult.success).toBe(false)
		if (!createResult.success) {
			expect(createResult.error).toBe('Create failed')
		}
	})

	it('should update product origin successfully', async () => {
		const mockInput: UpdateProductOriginInput = {
			name: 'Origen Actualizado',
		}

		const mockUpdated: ProductOrigin = {
			idOrigin: 1,
			name: 'Origen Actualizado',
			description: null,
			status: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		}

		vi.mocked(originApi.updateProductOrigin).mockResolvedValueOnce(mockUpdated)

		const { result } = renderHook(() => useProductOriginMutations())

		const updateResult = await result.current.update(1, mockInput)

		expect(updateResult.success).toBe(true)
		if (updateResult.success) {
			expect(updateResult.data).toEqual(mockUpdated)
		}
	})

	it('should delete product origin successfully', async () => {
		vi.mocked(originApi.deleteProductOrigin).mockResolvedValueOnce(undefined)

		const { result } = renderHook(() => useProductOriginMutations())

		const deleteResult = await result.current.remove(1)

		expect(deleteResult.success).toBe(true)
		expect(originApi.deleteProductOrigin).toHaveBeenCalledWith(1)
	})
})

describe('useClientOriginMutations', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should create client origin successfully', async () => {
		const mockInput: CreateClientOriginInput = {
			name: 'Nuevo Origen Cliente',
			status: true,
		}

		const mockCreated: ClientOrigin = {
			idClientOrigin: 1,
			name: 'Nuevo Origen Cliente',
			description: null,
			status: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		}

		vi.mocked(originApi.createClientOrigin).mockResolvedValueOnce(mockCreated)

		const { result } = renderHook(() => useClientOriginMutations())

		const createResult = await result.current.create(mockInput)

		expect(createResult.success).toBe(true)
		if (createResult.success) {
			expect(createResult.data).toEqual(mockCreated)
		}
	})

	it('should update client origin successfully', async () => {
		const mockInput: UpdateClientOriginInput = {
			name: 'Origen Cliente Actualizado',
		}

		const mockUpdated: ClientOrigin = {
			idClientOrigin: 1,
			name: 'Origen Cliente Actualizado',
			description: null,
			status: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		}

		vi.mocked(originApi.updateClientOrigin).mockResolvedValueOnce(mockUpdated)

		const { result } = renderHook(() => useClientOriginMutations())

		const updateResult = await result.current.update(1, mockInput)

		expect(updateResult.success).toBe(true)
		if (updateResult.success) {
			expect(updateResult.data).toEqual(mockUpdated)
		}
	})

	it('should delete client origin successfully', async () => {
		vi.mocked(originApi.deleteClientOrigin).mockResolvedValueOnce(undefined)

		const { result } = renderHook(() => useClientOriginMutations())

		const deleteResult = await result.current.remove(1)

		expect(deleteResult.success).toBe(true)
		expect(originApi.deleteClientOrigin).toHaveBeenCalledWith(1)
	})
})
