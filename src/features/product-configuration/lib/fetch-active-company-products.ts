export interface ActiveCompanyProduct {
	idProduct: number
	name: string
	idCompany: number
}

const PAGE_SIZE = 100
const MAX_PAGES = 50

interface ProductPagePayload {
	products?: ActiveCompanyProduct[]
	pagination?: {
		totalPages?: number
	}
}

interface ProductListBody {
	data?: ProductPagePayload
}

/**
 * Loads every active product of a company.
 * The products endpoint defaults to 10 rows, which hides later names
 * such as "Vida Deudor" from the configuration selector.
 */
export async function fetchAllActiveCompanyProducts(
	companyId: number,
	request: typeof fetch = fetch
): Promise<ActiveCompanyProduct[]> {
	const collected: ActiveCompanyProduct[] = []
	let page = 1
	let totalPages = 1

	while (page <= totalPages && page <= MAX_PAGES) {
		const response = await request(
			`/api/products?idCompany=${companyId}&status=active&page=${page}&pageSize=${PAGE_SIZE}`
		)
		const result = (await response.json()) as ProductListBody
		const products = result.data?.products
		if (!products) {
			throw new Error('No se pudieron cargar los productos')
		}

		collected.push(...products)
		const reportedPages = result.data?.pagination?.totalPages
		totalPages =
			typeof reportedPages === 'number' && reportedPages > 0
				? reportedPages
				: 1
		page += 1
	}

	return collected
}
