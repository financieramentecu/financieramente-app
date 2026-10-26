import { describe, expect, it, vi } from 'vitest'
import { fetchAllActiveCompanyProducts } from '@/features/product-configuration/lib/fetch-active-company-products'

function pageResponse(
	products: { idProduct: number; name: string; idCompany: number }[],
	totalPages: number
) {
	return {
		json: async () => ({
			data: {
				products,
				pagination: { totalPages },
			},
		}),
	}
}

describe('fetchAllActiveCompanyProducts', () => {
	it('keeps products that fall after the default first page of 10', async () => {
		const request = vi
			.fn()
			.mockResolvedValueOnce(
				pageResponse(
					Array.from({ length: 10 }, (_, index) => ({
						idProduct: index + 1,
						name: `Producto ${index + 1}`,
						idCompany: 4,
					})),
					2
				)
			)
			.mockResolvedValueOnce(
				pageResponse(
					[
						{
							idProduct: 88,
							name: 'Vida Deudor',
							idCompany: 4,
						},
					],
					2
				)
			)

		const products = await fetchAllActiveCompanyProducts(
			4,
			request as unknown as typeof fetch
		)

		expect(request).toHaveBeenNthCalledWith(
			1,
			'/api/products?idCompany=4&status=active&page=1&pageSize=100'
		)
		expect(request).toHaveBeenNthCalledWith(
			2,
			'/api/products?idCompany=4&status=active&page=2&pageSize=100'
		)
		expect(products.map((product) => product.name)).toContain('Vida Deudor')
	})

	it('loads page 51 instead of stopping at a 50-page cap', async () => {
		const request = vi.fn(async (url: string) => {
			const page = Number(new URL(url, 'http://local').searchParams.get('page'))
			return pageResponse(
				[{ idProduct: page, name: `Producto ${page}`, idCompany: 4 }],
				51
			)
		})

		const products = await fetchAllActiveCompanyProducts(
			4,
			request as unknown as typeof fetch
		)

		expect(request).toHaveBeenCalledTimes(51)
		expect(products).toHaveLength(51)
		expect(products[50]).toEqual({
			idProduct: 51,
			name: 'Producto 51',
			idCompany: 4,
		})
	})
})
