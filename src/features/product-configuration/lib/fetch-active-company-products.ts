export interface ActiveCompanyProduct {
	idProduct: number
	name: string
	idCompany: number
}

const PAGE_SIZE = 100

interface ProductPagePayload {
	products?: ActiveCompanyProduct[]
	pagination?: {
		totalPages?: number
	}
}

interface ProductListBody {
	data?: ProductPagePayload
}

function resolveTotalPages(reportedPages: number | undefined): number {
	if (
		typeof reportedPages === 'number' &&
		Number.isSafeInteger(reportedPages) &&
		reportedPages > 0
	) {
		return reportedPages
	}
	return 1
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

	while (page <= totalPages) {
		const response = await request(
			`/api/products?idCompany=${companyId}&status=active&page=${page}&pageSize=${PAGE_SIZE}`
		)
		const result = (await response.json()) as ProductListBody
		const products = result.data?.products
		if (!products) {
			throw new Error('No se pudieron cargar los productos')
		}

		collected.push(...products)
		totalPages = resolveTotalPages(result.data?.pagination?.totalPages)
		page += 1
	}

	return collected
}
