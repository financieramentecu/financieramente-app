import { describe, it, expect } from 'vitest'
import { extractKpiFromGroups } from '@/features/negocios/services/business-stats.service'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'

describe('extractKpiFromGroups', () => {
	const currencies = [
		{ idCurrency: 1, symbol: 'COP', name: 'Peso Colombiano' },
		{ idCurrency: 2, symbol: 'USD', name: 'Dolar' },
	]

	it('returns zeros when there are no groups (CA3)', () => {
		expect(
			extractKpiFromGroups([], BUSINESS_STATUS.EMITIDO, currencies)
		).toEqual({ count: 0, totalCop: 0, totalUsd: 0 })
	})

	it('ignores other statuses', () => {
		const groups = [
			{
				status: BUSINESS_STATUS.FONDEADO,
				idCurrency: 1,
				_count: { idBusiness: 4 },
				_sum: { value: 200 },
			},
		]
		expect(
			extractKpiFromGroups(groups, BUSINESS_STATUS.EMITIDO, currencies)
		).toEqual({ count: 0, totalCop: 0, totalUsd: 0 })
	})

	it('treats null sum as zero', () => {
		const groups = [
			{
				status: BUSINESS_STATUS.EMITIDO,
				idCurrency: 1,
				_count: { idBusiness: 1 },
				_sum: { value: null },
			},
		]
		expect(
			extractKpiFromGroups(groups, BUSINESS_STATUS.EMITIDO, currencies)
		).toEqual({ count: 1, totalCop: 0, totalUsd: 0 })
	})
})
