import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		reportDefinition: {
			upsert: vi.fn(),
			findMany: vi.fn(),
			findFirst: vi.fn(),
		},
		category: {
			findMany: vi.fn(),
		},
		categoryReportPermission: {
			findMany: vi.fn(),
		},
	},
}))

import { prisma } from '@/lib/prisma'
import {
	ensureKnownReportDefinitions,
	getReportPermissionsCatalog,
} from '@/features/report-permissions/services/report-permissions.service'
import {
	KNOWN_REPORT_DEFINITIONS,
	REPORT_CODES,
} from '@/features/report-permissions/types/report-permissions.types'

describe('ensureKnownReportDefinitions', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('upserts every known report including ABA_MFUND', async () => {
		vi.mocked(prisma.reportDefinition.upsert).mockResolvedValue({} as never)

		await ensureKnownReportDefinitions()

		expect(prisma.reportDefinition.upsert).toHaveBeenCalledTimes(
			KNOWN_REPORT_DEFINITIONS.length
		)
		expect(prisma.reportDefinition.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { code: REPORT_CODES.ABA_MFUND },
				create: expect.objectContaining({
					code: REPORT_CODES.ABA_MFUND,
					name: 'ABA-MFUND',
					status: true,
				}),
			})
		)
		expect(prisma.reportDefinition.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { code: REPORT_CODES.LEADS_ANALYTICS },
			})
		)
		expect(prisma.reportDefinition.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { code: REPORT_CODES.PRODUCCION_REAL },
			})
		)
	})
})

describe('getReportPermissionsCatalog', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('ensures the catalog then lists all known reports', async () => {
		vi.mocked(prisma.reportDefinition.upsert).mockResolvedValue({} as never)
		vi.mocked(prisma.reportDefinition.findMany).mockResolvedValue(
			KNOWN_REPORT_DEFINITIONS.map((report, index) => ({
				id: index + 1,
				code: report.code,
				name: report.name,
				description: report.description,
				routePath: report.routePath,
				status: true,
			})) as never
		)
		vi.mocked(prisma.reportDefinition.findFirst).mockResolvedValue({
			id: 1,
			code: REPORT_CODES.ABA_MFUND,
			name: 'ABA-MFUND',
			description: null,
			routePath: '/dashboard/reportes/aba-mfund',
			status: true,
		} as never)
		vi.mocked(prisma.category.findMany).mockResolvedValue([] as never)
		vi.mocked(prisma.categoryReportPermission.findMany).mockResolvedValue(
			[] as never
		)

		const catalog = await getReportPermissionsCatalog()

		expect(prisma.reportDefinition.upsert).toHaveBeenCalledTimes(
			KNOWN_REPORT_DEFINITIONS.length
		)
		expect(catalog.reports.map((report) => report.code)).toEqual([
			REPORT_CODES.PRODUCCION_REAL,
			REPORT_CODES.LEADS_ANALYTICS,
			REPORT_CODES.ABA_MFUND,
		])
		expect(catalog.reports.some((report) => report.name === 'ABA-MFUND')).toBe(
			true
		)
	})
})
