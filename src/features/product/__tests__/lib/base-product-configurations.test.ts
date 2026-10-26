import { describe, expect, it } from 'vitest'
import {
	BASE_CONFIGURATION_PLAN_STATUS,
	planBaseProductConfigurations,
	planMissingBaseConfigurations,
	REMEDIATION_PROBLEM,
} from '@/features/product/lib/base-product-configurations'

const activeLevels = [
	{ idLevel: 1, code: 'LEVEL_0' },
	{ idLevel: 2, code: 'GENERAL_LEVEL' },
]

describe('planBaseProductConfigurations', () => {
	it('builds one code per active level for Universal NOVA / BMI', () => {
		const plan = planBaseProductConfigurations({
			companyName: 'BMI',
			productName: 'Universal NOVA',
			levels: activeLevels,
		})

		expect(plan.status).toBe(BASE_CONFIGURATION_PLAN_STATUS.OK)
		if (plan.status !== BASE_CONFIGURATION_PLAN_STATUS.OK) {
			return
		}
		expect(plan.drafts).toEqual([
			{
				idLevel: 1,
				levelCode: 'LEVEL_0',
				code: 'BMI-UNIVERSAL_NOVA-LEVEL_0',
			},
			{
				idLevel: 2,
				levelCode: 'GENERAL_LEVEL',
				code: 'BMI-UNIVERSAL_NOVA-GENERAL_LEVEL',
			},
		])
	})

	it('rejects the whole plan when a code exceeds 50 characters', () => {
		const plan = planBaseProductConfigurations({
			companyName: 'Compañía con un nombre extremadamente largo',
			productName: 'Producto con nombre también muy largo',
			levels: [{ idLevel: 1, code: 'GENERAL_LEVEL' }],
		})

		expect(plan.status).toBe(BASE_CONFIGURATION_PLAN_STATUS.CODE_TOO_LONG)
	})
})

describe('planMissingBaseConfigurations', () => {
	it('skips existing product-level pairs and does not duplicate codes', () => {
		const plan = planMissingBaseConfigurations({
			products: [
				{ idProduct: 93, name: 'Universal NOVA', companyName: 'BMI' },
			],
			levels: activeLevels,
			existingPairs: [{ idProduct: 93, idLevel: 1 }],
			existingCodes: ['BMI-UNIVERSAL_NOVA-LEVEL_0'],
		})

		expect(plan.skippedExisting).toBe(1)
		expect(plan.inserts).toEqual([
			{
				idProduct: 93,
				idLevel: 2,
				code: 'BMI-UNIVERSAL_NOVA-GENERAL_LEVEL',
				productName: 'Universal NOVA',
				companyName: 'BMI',
				levelCode: 'GENERAL_LEVEL',
			},
		])
		expect(plan.problems).toEqual([])
	})

	it('reports a code collision instead of planning a duplicate code', () => {
		const plan = planMissingBaseConfigurations({
			products: [
				{ idProduct: 93, name: 'Universal NOVA', companyName: 'BMI' },
			],
			levels: [{ idLevel: 1, code: 'LEVEL_0' }],
			existingPairs: [],
			existingCodes: ['BMI-UNIVERSAL_NOVA-LEVEL_0'],
		})

		expect(plan.inserts).toEqual([])
		expect(plan.problems[0]?.code).toBe(REMEDIATION_PROBLEM.CODE_COLLISION)
	})
})
