import { describe, expect, it, vi, beforeEach } from 'vitest'
import * as XLSX from 'xlsx-js-style'
import {
	buildProduccionRealExcelBuffer,
	PRODUCCION_REAL_SHEET,
} from '../lib/build-produccion-real-excel'
import { getProduccionRealKpis } from '../services/produccion-real-kpi.service'
import { CURRENCY_MODE } from '../types/produccion-real.types'
import type { ProduccionRealFilters } from '../types/produccion-real.types'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			groupBy: vi.fn(),
		},
	},
}))

import { prisma } from '@/lib/prisma'

function filters(
	overrides: Partial<ProduccionRealFilters> = {}
): ProduccionRealFilters {
	return {
		dateFrom: '2026-08-01',
		dateTo: '2026-08-31',
		contributionTypes: [],
		companyIds: [],
		currencyMode: CURRENCY_MODE.ALL_TRM,
		userIds: [1],
		...overrides,
	}
}

describe('getProduccionRealKpis', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('short-circuits to zeros without querying when hierarchy is empty', async () => {
		const result = await getProduccionRealKpis({
			filters: filters({ userIds: [] }),
			trmRate: 4000,
		})

		expect(prisma.business.groupBy).not.toHaveBeenCalled()
		expect(result.produccionReal).toEqual({ sum: 0, count: 0 })
		expect(result.fondeado.conversionPercent).toBe(0)
	})

	it('computes Fondeado % from converted totals', async () => {
		vi.mocked(prisma.business.groupBy)
			// produccionReal: 8000 COP → 2 USD @ TRM 4000
			.mockResolvedValueOnce([
				{
					idCurrency: 1,
					_count: { idBusiness: 2 },
					_sum: { value: 8000 },
				},
			] as never)
			// regular
			.mockResolvedValueOnce([
				{
					idCurrency: 1,
					_count: { idBusiness: 1 },
					_sum: { value: 4000 },
				},
			] as never)
			// unico
			.mockResolvedValueOnce([
				{
					idCurrency: 1,
					_count: { idBusiness: 1 },
					_sum: { value: 4000 },
				},
			] as never)
			// fondeado: 4000 COP → 1 USD
			.mockResolvedValueOnce([
				{
					idCurrency: 1,
					_count: { idBusiness: 1 },
					_sum: { value: 4000 },
				},
			] as never)

		const result = await getProduccionRealKpis({
			filters: filters(),
			trmRate: 4000,
		})

		expect(result.produccionReal.sum).toBe(2)
		expect(result.fondeado.sum).toBe(1)
		expect(result.fondeado.conversionPercent).toBe(50)
		expect(prisma.business.groupBy).toHaveBeenCalledTimes(4)
	})
})

describe('buildProduccionRealExcelBuffer', () => {
	it('includes Resumen KPI, Regular vs Única, and Detalle sheets', () => {
		const buffer = buildProduccionRealExcelBuffer({
			kpis: {
				produccionReal: { sum: 100, count: 2 },
				regular: { sum: 60, count: 1 },
				unico: { sum: 40, count: 1 },
				fondeado: { sum: 50, count: 1, conversionPercent: 50 },
				currencyMode: CURRENCY_MODE.ALL_TRM,
				displayCurrencyCode: 'USD',
			},
			rows: [
				{
					idBusiness: 1,
					createdAt: '2026-08-05T17:00:00.000Z',
					createdAtLabel: '05/08/2026',
					clientName: 'Cliente',
					agentName: 'Agente',
					companyName: 'Compañía',
					productName: 'Producto',
					contributionType: 'REGULAR',
					contributionTypeLabel: 'Regular',
					status: 'EMITIDO',
					value: 60,
					dateIssued: '2026-08-01T17:00:00.000Z',
					dateIssuedLabel: '01/08/2026',
					dateAnchored: null,
					dateAnchoredLabel: '',
					idCurrency: 1,
				},
			],
		})

		const workbook = XLSX.read(buffer, { type: 'buffer' })
		expect(workbook.SheetNames).toEqual([
			PRODUCCION_REAL_SHEET.RESUMEN_KPI,
			PRODUCCION_REAL_SHEET.REGULAR_VS_UNICA,
			PRODUCCION_REAL_SHEET.DETALLE,
		])
	})
})
