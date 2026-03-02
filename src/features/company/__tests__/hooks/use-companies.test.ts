import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCompanies } from '../../hooks/use-companies'
import { companyApi } from '../../lib/company-api'
import {
	createMockCompany,
	createMockCompanyListResponse,
} from '../fixtures/mock-company'

// Mock companyApi
vi.mock('../../lib/company-api', () => ({
	companyApi: {
		getCompanies: vi.fn(),
	},
}))

describe('useCompanies', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should start with loading state', async () => {
		vi.mocked(companyApi.getCompanies).mockResolvedValueOnce({
			data: createMockCompanyListResponse(),
		})

		const { result } = renderHook(() => useCompanies())

		expect(result.current.state.status).toBe('loading')
		expect(result.current.state.data).toBeUndefined()

		await waitFor(() => {
			expect(result.current.state.status).not.toBe('loading')
		})
	})

	it('should fetch companies successfully', async () => {
		const mockResponse = createMockCompanyListResponse([
			createMockCompany({ idCompany: 1, name: 'Skandia' }),
			createMockCompany({ idCompany: 2, name: 'Sura' }),
		])

		vi.mocked(companyApi.getCompanies).mockResolvedValueOnce({
			data: mockResponse,
		})

		const { result } = renderHook(() => useCompanies())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(result.current.state.data).toEqual(mockResponse)
		expect(result.current.state.data?.companies).toHaveLength(2)
	})

	it('should handle API error', async () => {
		vi.mocked(companyApi.getCompanies).mockResolvedValueOnce({
			data: null,
			error: 'Error al obtener empresas',
		})

		const { result } = renderHook(() => useCompanies())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Error al obtener empresas')
		expect(result.current.state.data).toBeUndefined()
	})

	it('should handle network error', async () => {
		vi.mocked(companyApi.getCompanies).mockRejectedValueOnce(
			new Error('Network error')
		)

		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => {})

		const { result } = renderHook(() => useCompanies())

		await waitFor(() => {
			expect(result.current.state.status).toBe('error')
		})

		expect(result.current.state.error).toBe('Network error')

		consoleError.mockRestore()
	})

	it('should pass search params to API', async () => {
		vi.mocked(companyApi.getCompanies).mockResolvedValueOnce({
			data: createMockCompanyListResponse(),
		})

		renderHook(() =>
			useCompanies({ search: 'Skandia', page: 1, pageSize: 10 })
		)

		await waitFor(() => {
			expect(companyApi.getCompanies).toHaveBeenCalledWith({
				search: 'Skandia',
				page: 1,
				pageSize: 10,
			})
		})
	})

	it('should pass status filter to API', async () => {
		vi.mocked(companyApi.getCompanies).mockResolvedValueOnce({
			data: createMockCompanyListResponse(),
		})

		renderHook(() => useCompanies({ status: 'active' }))

		await waitFor(() => {
			expect(companyApi.getCompanies).toHaveBeenCalledWith({
				status: 'active',
			})
		})
	})

	it('should refetch when refetch is called', async () => {
		const mockResponse = createMockCompanyListResponse()
		vi.mocked(companyApi.getCompanies).mockResolvedValue({
			data: mockResponse,
		})

		const { result } = renderHook(() => useCompanies())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(companyApi.getCompanies).toHaveBeenCalledTimes(1)

		await result.current.refetch()

		await waitFor(() => {
			expect(companyApi.getCompanies).toHaveBeenCalledTimes(2)
		})
	})

	it('should refetch when params change', async () => {
		const mockResponse = createMockCompanyListResponse()
		vi.mocked(companyApi.getCompanies).mockResolvedValue({
			data: mockResponse,
		})

		const { rerender } = renderHook(
			({ search }) => useCompanies({ search }),
			{
				initialProps: { search: 'Skandia' },
			}
		)

		await waitFor(() => {
			expect(companyApi.getCompanies).toHaveBeenCalledWith({
				search: 'Skandia',
			})
		})

		rerender({ search: 'Sura' })

		await waitFor(() => {
			expect(companyApi.getCompanies).toHaveBeenCalledWith({
				search: 'Sura',
			})
		})
	})
})
