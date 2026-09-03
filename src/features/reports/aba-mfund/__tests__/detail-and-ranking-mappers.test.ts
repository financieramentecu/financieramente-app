import { describe, expect, it } from 'vitest'
import { formatDateBogota } from '@/features/shared/lib/format-date'
import { formatClientName } from '../lib/format-client-name'
import { formatAbaMfundMoney } from '../lib/format-aba-mfund-money'
import { mapAbaMfundDetailRow } from '../mappers/aba-mfund-detail.mapper'
import { mapRankingBusinessToCellRow } from '../mappers/aba-mfund-ranking.mapper'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'

describe('formatClientName', () => {
	it('joins Nombre - Apellido with a hyphen', () => {
		expect(formatClientName('Ana', 'Gómez')).toBe('Ana - Gómez')
	})

	it('returns only the first name when lastName is missing', () => {
		expect(formatClientName('Ana', null)).toBe('Ana')
	})
})

describe('formatAbaMfundMoney', () => {
	it('formats COP without pulling TRM display types', () => {
		expect(formatAbaMfundMoney(250000)).toMatch(/^COP \$/)
		expect(formatAbaMfundMoney(250000)).toContain('250')
	})
})

describe('mapAbaMfundDetailRow', () => {
	const createdAt = new Date('2026-08-10T17:00:00.000Z')
	const dateIssued = new Date('2026-08-12T17:00:00.000Z')
	const dateAnchored = new Date('2026-08-15T17:00:00.000Z')

	it('maps HU columns: Cliente hyphen, Fecha de Fondeo = dateAnchored', () => {
		const row = mapAbaMfundDetailRow({
			idBusiness: 42,
			value: 1_000_000,
			status: BUSINESS_STATUS.FONDEADO,
			createdAt,
			dateIssued,
			dateAnchored,
			client: { name: 'Ana', lastName: 'Gómez' },
			buyPeriodicity: { name: 'Mensual' },
		})

		expect(row.clientName).toBe('Ana - Gómez')
		expect(row.periodicityName).toBe('Mensual')
		expect(row.status).toBe(BUSINESS_STATUS.FONDEADO)
		expect(row.value).toBe(1_000_000)
		expect(row.createdAtLabel).toBe(formatDateBogota(createdAt))
		expect(row.dateIssuedLabel).toBe(formatDateBogota(dateIssued))
		expect(row.dateAnchoredLabel).toBe(formatDateBogota(dateAnchored))
		expect(row.dateAnchored).toBe(dateAnchored.toISOString())
		expect(row.dateAnchored).not.toBe(createdAt.toISOString())
		expect(row.dateAnchored).not.toBe(dateIssued.toISOString())
	})
})

describe('mapRankingBusinessToCellRow', () => {
	it('maps heatmap CellBusinessRowView fields (Producto, Contrato, Valor, Estado)', () => {
		const view = mapRankingBusinessToCellRow({
			idBusiness: 7,
			contract: 'C-001',
			value: 5000,
			status: BUSINESS_STATUS.EMITIDO,
			currency: { name: 'COP' },
			productPercentageCommission: {
				productConfiguration: {
					product: {
						name: 'MFUND',
						company: { name: 'SKANDIA' },
					},
				},
			},
		})

		expect(view).toEqual({
			idBusiness: 7,
			companyName: 'SKANDIA',
			productName: 'MFUND',
			contract: 'C-001',
			value: 5000,
			currencyName: 'COP',
			status: BUSINESS_STATUS.EMITIDO,
		})
	})
})
