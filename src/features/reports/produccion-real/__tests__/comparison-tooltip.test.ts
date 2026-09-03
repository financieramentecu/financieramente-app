import { describe, expect, it } from 'vitest'
import { buildComparisonTooltipModel } from '../lib/comparison-tooltip'
import { PRODUCCION_REAL_UI } from '../lib/ui-copy'

describe('buildComparisonTooltipModel', () => {
	it('formats operations, COP, USD and consolidated USD from the split', () => {
		const model = buildComparisonTooltipModel(
			{ count: 3, totalCop: 8000, totalForeignUsd: 10 },
			4000
		)

		expect(model.operationsCount).toBe(3)
		expect(model.operationsCaption).toBe(PRODUCCION_REAL_UI.OPERACIONES_PLURAL)
		expect(model.copLabel).toBe('COP $8.000')
		expect(model.usdLabel).toBe('USD 10.00')
		expect(model.totalUsdLabel).toBe('USD 12.00')
	})

	it('uses the singular caption for one operation', () => {
		const model = buildComparisonTooltipModel(
			{ count: 1, totalCop: 0, totalForeignUsd: 25 },
			4000
		)

		expect(model.operationsCaption).toBe(PRODUCCION_REAL_UI.OPERACION_SINGULAR)
		expect(model.totalUsdLabel).toBe('USD 25.00')
	})

	it('zeroes the COP portion of total USD when TRM is missing', () => {
		const model = buildComparisonTooltipModel(
			{ count: 2, totalCop: 8000, totalForeignUsd: 10 },
			null
		)

		expect(model.totalUsdLabel).toBe('USD 10.00')
	})
})
