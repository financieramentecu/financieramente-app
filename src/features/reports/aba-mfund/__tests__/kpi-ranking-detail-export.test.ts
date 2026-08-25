import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as XLSX from 'xlsx-js-style'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
import {
	buildAbaMfundExcelBuffer,
	buildAbaMfundExcelFilename,
	ABA_MFUND_SHEET,
} from '../lib/build-aba-mfund-excel'
import { ABA_MFUND_UI } from '../lib/ui-copy'
import { getAbaMfundKpis } from '../services/aba-mfund-kpi.service'
import {
	exportAbaMfundExcel,
	AbaMfundExportEmptyError,
	AbaMfundExportOversizeError,
} from '../services/aba-mfund-export.service'
import { getAbaMfundDetail } from '../services/aba-mfund-detail.service'
import { getAbaMfundRanking } from '../services/aba-mfund-ranking.service'
import {
	ABA_MFUND_EXPORT_MAX_ROWS,
	ABA_MFUND_RANKING_EMBED_CAP,
	type AbaMfundDetailRow,
	type AbaMfundFilters,
} from '../types/aba-mfund.types'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		business: {
			aggregate: vi.fn(),
			groupBy: vi.fn(),
			findMany: vi.fn(),
			count: vi.fn(),
		},
		user: {
			findMany: vi.fn(),
		},
	},
}))

import { prisma } from '@/lib/prisma'

function filters(overrides: Partial<AbaMfundFilters> = {}): AbaMfundFilters {
	return {
		dateFrom: '2026-08-01',
		dateTo: '2026-08-31',
		userIds: [1],
		statuses: [],
		...overrides,
	}
}

function metric(sum: number, count: number) {
	return {
		_sum: { value: sum },
		_count: { idBusiness: count },
	}
}

describe('getAbaMfundKpis', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('short-circuits to zeros without Prisma when userIds is empty', async () => {
		const result = await getAbaMfundKpis({
			filters: filters({ userIds: [] }),
		})

		expect(prisma.business.aggregate).not.toHaveBeenCalled()
		expect(result).toEqual({
			abaTotal: { sum: 0, count: 0 },
			fondeado: { sum: 0, count: 0 },
			emitido: { sum: 0, count: 0 },
			ticketPromedio: 0,
		})
	})

	it('computes ABA Total, Fondeado, Emitido, and ticket promedio in COP', async () => {
		vi.mocked(prisma.business.aggregate)
			.mockResolvedValueOnce(metric(1_000_000, 4) as never)
			.mockResolvedValueOnce(metric(400_000, 1) as never)
			.mockResolvedValueOnce(metric(250_000, 1) as never)

		const result = await getAbaMfundKpis({ filters: filters() })

		expect(result.abaTotal).toEqual({ sum: 1_000_000, count: 4 })
		expect(result.fondeado).toEqual({ sum: 400_000, count: 1 })
		expect(result.emitido).toEqual({ sum: 250_000, count: 1 })
		expect(result.ticketPromedio).toBe(250_000)
		expect(prisma.business.aggregate).toHaveBeenCalledTimes(3)

		const fondeadoWhere = JSON.stringify(
			vi.mocked(prisma.business.aggregate).mock.calls[1][0]
		)
		expect(fondeadoWhere).toContain(BUSINESS_STATUS.FONDEADO)

		const emitidoWhere = JSON.stringify(
			vi.mocked(prisma.business.aggregate).mock.calls[2][0]
		)
		expect(emitidoWhere).toContain(BUSINESS_STATUS.EMITIDO)
	})
})

describe('getAbaMfundDetail', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('short-circuits to empty without Prisma when userIds is empty', async () => {
		const result = await getAbaMfundDetail({
			filters: filters({ userIds: [] }),
			cursor: null,
			limit: 50,
		})

		expect(prisma.business.findMany).not.toHaveBeenCalled()
		expect(result).toEqual({ rows: [], nextCursor: null, hasMore: false })
	})

	it('uses keyset take limit+1 and maps Cliente with hyphen', async () => {
		const createdAt = new Date('2026-08-10T17:00:00.000Z')
		vi.mocked(prisma.business.findMany).mockResolvedValueOnce([
			{
				idBusiness: 9,
				value: 100,
				status: BUSINESS_STATUS.EMITIDO,
				createdAt,
				dateIssued: null,
				dateAnchored: new Date('2026-08-15T17:00:00.000Z'),
				client: { name: 'Ana', lastName: 'Gómez' },
				buyPeriodicity: { name: 'Mensual' },
			},
		] as never)

		const result = await getAbaMfundDetail({
			filters: filters(),
			cursor: null,
			limit: 50,
		})

		expect(vi.mocked(prisma.business.findMany).mock.calls[0][0]).toMatchObject({
			orderBy: [{ createdAt: 'desc' }, { idBusiness: 'desc' }],
			take: 51,
		})
		expect(result.rows[0]?.clientName).toBe('Ana - Gómez')
		expect(result.hasMore).toBe(false)
		expect(result.nextCursor).toBeNull()
	})
})

describe('getAbaMfundRanking', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('short-circuits to empty without Prisma when userIds is empty', async () => {
		const result = await getAbaMfundRanking({
			filters: filters({ userIds: [] }),
		})

		expect(prisma.business.groupBy).not.toHaveBeenCalled()
		expect(prisma.user.findMany).not.toHaveBeenCalled()
		expect(result.agents).toEqual([])
	})

	it('groups by idUser (owner), sorts in memory, takes 6, embeds businesses', async () => {
		vi.mocked(prisma.business.groupBy).mockResolvedValueOnce([
			{ idUser: 2, _sum: { value: 300 }, _count: { idBusiness: 2 } },
			{ idUser: 1, _sum: { value: 100 }, _count: { idBusiness: 1 } },
		] as never)
		vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
			{ idUser: 1, name: 'Ana', lastName: 'López' },
			{ idUser: 2, name: 'Beto', lastName: 'Ruiz' },
		] as never)
		vi.mocked(prisma.business.findMany)
			.mockResolvedValueOnce([
				{
					idBusiness: 10,
					contract: 'C-10',
					value: 200,
					status: BUSINESS_STATUS.FONDEADO,
					createdAt: new Date('2026-08-20T12:00:00.000Z'),
					currency: { name: 'COP' },
					productPercentageCommission: {
						productConfiguration: {
							product: { name: 'MFUND', company: { name: 'SKANDIA' } },
						},
					},
				},
			] as never)
			.mockResolvedValueOnce([
				{
					idBusiness: 11,
					contract: 'C-11',
					value: 100,
					status: BUSINESS_STATUS.EMITIDO,
					createdAt: new Date('2026-08-19T12:00:00.000Z'),
					currency: { name: 'COP' },
					productPercentageCommission: {
						productConfiguration: {
							product: { name: 'MFUND', company: { name: 'SKANDIA' } },
						},
					},
				},
			] as never)

		const result = await getAbaMfundRanking({ filters: filters() })

		expect(prisma.business.groupBy).toHaveBeenCalledWith(
			expect.objectContaining({ by: ['idUser'] })
		)
		expect(result.agents).toHaveLength(2)
		expect(result.agents[0]?.idUser).toBe(2)
		expect(result.agents[0]?.agentName).toBe('Beto Ruiz')
		expect(result.agents[0]?.totalValue).toBe(300)
		expect(result.agents[0]?.businesses[0]?.contract).toBe('C-10')
		expect(result.agents[0]?.businesses[0]?.productName).toBe('MFUND')

		const embedCall = vi.mocked(prisma.business.findMany).mock.calls[0]?.[0]
		expect(embedCall).toBeDefined()
		expect(embedCall?.take).toBe(ABA_MFUND_RANKING_EMBED_CAP)
		expect(embedCall?.orderBy).toEqual([
			{ createdAt: 'desc' },
			{ idBusiness: 'desc' },
		])
	})
})

describe('exportAbaMfundExcel', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('throws empty error without Prisma when userIds is empty', async () => {
		await expect(
			exportAbaMfundExcel(filters({ userIds: [] }))
		).rejects.toBeInstanceOf(AbaMfundExportEmptyError)
		expect(prisma.business.count).not.toHaveBeenCalled()
		expect(prisma.business.findMany).not.toHaveBeenCalled()
	})

	it('throws empty error when count is 0', async () => {
		vi.mocked(prisma.business.count).mockResolvedValueOnce(0)
		await expect(exportAbaMfundExcel(filters())).rejects.toBeInstanceOf(
			AbaMfundExportEmptyError
		)
		expect(prisma.business.findMany).not.toHaveBeenCalled()
	})

	it('throws oversize error when count exceeds 5000 (no detail query)', async () => {
		vi.mocked(prisma.business.count).mockResolvedValueOnce(
			ABA_MFUND_EXPORT_MAX_ROWS + 1
		)
		await expect(exportAbaMfundExcel(filters())).rejects.toBeInstanceOf(
			AbaMfundExportOversizeError
		)
		expect(prisma.business.findMany).not.toHaveBeenCalled()
	})
})

describe('buildAbaMfundExcelBuffer', () => {
	const row: AbaMfundDetailRow = {
		idBusiness: 1,
		createdAt: '2026-08-05T17:00:00.000Z',
		createdAtLabel: '5 ago 2026',
		clientName: 'Ana - Gómez',
		periodicityName: 'Mensual',
		status: BUSINESS_STATUS.FONDEADO,
		value: 250000,
		dateIssued: '2026-08-01T17:00:00.000Z',
		dateIssuedLabel: '1 ago 2026',
		dateAnchored: '2026-08-15T17:00:00.000Z',
		dateAnchoredLabel: '15 ago 2026',
	}

	it('builds one sheet whose columns match the HU detail table', () => {
		const buffer = buildAbaMfundExcelBuffer({ rows: [row] })
		const workbook = XLSX.read(buffer, { type: 'buffer' })
		expect(workbook.SheetNames).toEqual([ABA_MFUND_SHEET.DETAIL])
		expect(workbook.SheetNames).toHaveLength(1)

		const sheet = workbook.Sheets[ABA_MFUND_SHEET.DETAIL]
		const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
		expect(aoa[0]).toEqual([
			ABA_MFUND_UI.COLUMN_CREATED,
			ABA_MFUND_UI.COLUMN_CLIENT,
			ABA_MFUND_UI.COLUMN_PERIODICITY,
			ABA_MFUND_UI.COLUMN_STATUS,
			ABA_MFUND_UI.COLUMN_VALUE,
			ABA_MFUND_UI.COLUMN_ISSUED,
			ABA_MFUND_UI.COLUMN_ANCHORED,
		])
		expect(aoa[1]?.[1]).toBe('Ana - Gómez')
		expect(aoa[1]?.[6]).toBe('15 ago 2026')
	})
})

describe('buildAbaMfundExcelFilename', () => {
	it('uses aba_mfund_<iso-timestamp>.xlsx', () => {
		const name = buildAbaMfundExcelFilename(
			new Date('2026-08-25T21:39:00.000Z')
		)
		expect(name).toBe('aba_mfund_2026-08-25T21-39-00.xlsx')
		expect(name.startsWith('aba_mfund_')).toBe(true)
		expect(name.endsWith('.xlsx')).toBe(true)
	})
})
