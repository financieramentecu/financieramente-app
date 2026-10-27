import { describe, expect, it } from 'vitest'
import { buildProductListWhere } from '@/features/product/lib/product-list-where'

describe('buildProductListWhere', () => {
	it('keeps the default list filters', () => {
		expect(
			buildProductListWhere({
				search: 'Seguro',
				status: 'active',
				idCompany: '1',
				eligible: false,
			})
		).toEqual({
			OR: [
				{ name: { contains: 'Seguro', mode: 'insensitive' } },
				{ company: { name: { contains: 'Seguro', mode: 'insensitive' } } },
			],
			status: true,
			idCompany: 1,
		})
	})

	it('requires an active product and an active company for selectors', () => {
		expect(
			buildProductListWhere({
				search: null,
				status: null,
				idCompany: '4',
				eligible: true,
			})
		).toEqual({
			status: true,
			company: { status: true },
			idCompany: 4,
		})
	})

	it('does not keep products of an inactive company when the selector is eligible', () => {
		const eligible = buildProductListWhere({
			search: null,
			status: 'active',
			idCompany: '4',
			eligible: true,
		})
		const activeProductOnly = buildProductListWhere({
			search: null,
			status: 'active',
			idCompany: '4',
			eligible: false,
		})

		expect(eligible).toEqual({
			status: true,
			company: { status: true },
			idCompany: 4,
		})
		expect(activeProductOnly.company).toBeUndefined()
	})
})
