import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProductConfigurationForm } from '../../hooks/use-product-configuration-form'
import { fetchAllActiveCompanyProducts } from '../../lib/fetch-active-company-products'

vi.mock('../../lib/fetch-active-company-products', () => ({
	fetchAllActiveCompanyProducts: vi.fn(),
}))

describe('useProductConfigurationForm', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				if (String(url).includes('eligible=true')) {
					return {
						json: async () => ({
							data: {
								products: [
									{ idProduct: 1, name: 'Producto 1', idCompany: 4 },
								],
							},
						}),
					}
				}

				return {
					json: async () => ({
						data: { companies: [], origins: [], levels: [] },
					}),
				}
			})
		)
	})

	it('keeps a product from a later page in the selector', async () => {
		vi.mocked(fetchAllActiveCompanyProducts).mockResolvedValue([
			{ idProduct: 1, name: 'Producto 1', idCompany: 4 },
			{ idProduct: 88, name: 'Vida Deudor', idCompany: 4 },
		])

		const { result } = renderHook(() =>
			useProductConfigurationForm({ mode: 'create' })
		)

		act(() => {
			result.current.form.setValue('idCompany', 4)
		})

		await waitFor(() => {
			expect(result.current.productsState.status).toBe('success')
		})

		expect(
			result.current.productsState.data?.map((product) => product.name)
		).toContain('Vida Deudor')
		expect(fetchAllActiveCompanyProducts).toHaveBeenCalledWith(4)

		const requestedUrls = vi
			.mocked(fetch)
			.mock.calls.map((call) => String(call[0]))
		expect(requestedUrls.some((url) => url.includes('/api/products'))).toBe(
			false
		)
	})
})
