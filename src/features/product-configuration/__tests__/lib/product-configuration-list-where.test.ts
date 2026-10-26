import { describe, expect, it } from 'vitest'
import { buildProductConfigurationListWhere } from '@/features/product-configuration/lib/product-configuration-list-where'

describe('buildProductConfigurationListWhere', () => {
	it('filters authorized selectors by active configuration, product, and company', () => {
		expect(
			buildProductConfigurationListWhere({
				search: 'Nova',
				active: null,
				eligible: true,
			})
		).toEqual({
			OR: [
				{ code: { contains: 'Nova', mode: 'insensitive' } },
				{ product: { name: { contains: 'Nova', mode: 'insensitive' } } },
				{ level: { name: { contains: 'Nova', mode: 'insensitive' } } },
			],
			active: true,
			product: {
				status: true,
				company: { status: true },
			},
		})
	})
})
