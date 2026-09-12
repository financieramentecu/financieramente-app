import { describe, expect, it, vi, beforeEach } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		categoryReportPermission: {
			findFirst: vi.fn(),
			findMany: vi.fn(),
		},
		reportDefinition: {
			findMany: vi.fn(),
		},
	},
}))

import { prisma } from '@/lib/prisma'
import {
	canViewReport,
	getAuthorizedReportCodes,
} from '@/features/report-permissions/services/report-permissions.service'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'

describe('canViewReport', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('allows ADMIN bypass without checking category permission', async () => {
		const allowed = await canViewReport(
			{ roleCode: UserRole.ADMIN, idCategory: null },
			'PRODUCCION_REAL'
		)
		expect(allowed).toBe(true)
		expect(prisma.categoryReportPermission.findFirst).not.toHaveBeenCalled()
	})

	it('denies when user has no category', async () => {
		const allowed = await canViewReport(
			{ roleCode: UserRole.AGENTE, idCategory: null },
			'PRODUCCION_REAL'
		)
		expect(allowed).toBe(false)
	})

	it('allows when active permission exists', async () => {
		vi.mocked(prisma.categoryReportPermission.findFirst).mockResolvedValue({
			id: 1,
		} as never)

		const allowed = await canViewReport(
			{ roleCode: UserRole.AGENTE, idCategory: 4 },
			'PRODUCCION_REAL'
		)
		expect(allowed).toBe(true)
		expect(prisma.categoryReportPermission.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					status: true,
					idCategory: 4,
				}),
			})
		)
	})

	it('denies when no active permission', async () => {
		vi.mocked(prisma.categoryReportPermission.findFirst).mockResolvedValue(null)

		const allowed = await canViewReport(
			{ roleCode: UserRole.AGENTE, idCategory: 4 },
			'PRODUCCION_REAL'
		)
		expect(allowed).toBe(false)
	})

	it('allows Performance Leader category when seeded permission is active', async () => {
		const performanceLeaderCategoryId = 4
		vi.mocked(prisma.categoryReportPermission.findFirst).mockResolvedValue({
			id: 99,
		} as never)

		const allowed = await canViewReport(
			{ roleCode: UserRole.AGENTE, idCategory: performanceLeaderCategoryId },
			'PRODUCCION_REAL'
		)
		expect(allowed).toBe(true)
		expect(prisma.categoryReportPermission.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					status: true,
					idCategory: performanceLeaderCategoryId,
					report: expect.objectContaining({
						code: 'PRODUCCION_REAL',
						status: true,
					}),
				}),
			})
		)
	})

	it('allows ADMIN bypass for ABA_MFUND without checking category permission', async () => {
		const allowed = await canViewReport(
			{ roleCode: UserRole.ADMIN, idCategory: null },
			REPORT_CODES.ABA_MFUND
		)
		expect(allowed).toBe(true)
		expect(prisma.categoryReportPermission.findFirst).not.toHaveBeenCalled()
	})

	it('allows Performance Leader when ABA_MFUND permission is active', async () => {
		const performanceLeaderCategoryId = 4
		vi.mocked(prisma.categoryReportPermission.findFirst).mockResolvedValue({
			id: 101,
		} as never)

		const allowed = await canViewReport(
			{ roleCode: UserRole.AGENTE, idCategory: performanceLeaderCategoryId },
			REPORT_CODES.ABA_MFUND
		)
		expect(allowed).toBe(true)
		expect(prisma.categoryReportPermission.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					status: true,
					idCategory: performanceLeaderCategoryId,
					report: expect.objectContaining({
						code: REPORT_CODES.ABA_MFUND,
						status: true,
					}),
				}),
			})
		)
	})

	it('allows Business Leader when ABA_MFUND permission is active', async () => {
		const businessLeaderCategoryId = 5
		vi.mocked(prisma.categoryReportPermission.findFirst).mockResolvedValue({
			id: 102,
		} as never)

		const allowed = await canViewReport(
			{ roleCode: UserRole.AGENTE, idCategory: businessLeaderCategoryId },
			REPORT_CODES.ABA_MFUND
		)
		expect(allowed).toBe(true)
		expect(prisma.categoryReportPermission.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					status: true,
					idCategory: businessLeaderCategoryId,
					report: expect.objectContaining({
						code: REPORT_CODES.ABA_MFUND,
						status: true,
					}),
				}),
			})
		)
	})

	it('denies unauthorized category for ABA_MFUND', async () => {
		vi.mocked(prisma.categoryReportPermission.findFirst).mockResolvedValue(null)

		const allowed = await canViewReport(
			{ roleCode: UserRole.AGENTE, idCategory: 1 },
			REPORT_CODES.ABA_MFUND
		)
		expect(allowed).toBe(false)
	})
})

describe('getAuthorizedReportCodes', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns all active reports for ADMIN', async () => {
		vi.mocked(prisma.reportDefinition.findMany).mockResolvedValue([
			{ code: 'PRODUCCION_REAL' },
		] as never)

		const result = await getAuthorizedReportCodes({
			roleCode: UserRole.ADMIN,
			idCategory: null,
		})
		expect(result.codes).toEqual(Object.values(REPORT_CODES))
	})

	it('still returns PRODUCCION_REAL and ABA_MFUND for ADMIN when the catalog is empty', async () => {
		vi.mocked(prisma.reportDefinition.findMany).mockResolvedValue([] as never)

		const result = await getAuthorizedReportCodes({
			roleCode: UserRole.ADMIN,
			idCategory: null,
		})
		expect(result.codes).toEqual(Object.values(REPORT_CODES))
		expect(result.codes).toContain('PRODUCCION_REAL')
		expect(result.codes).toContain('ABA_MFUND')
	})

	it('still returns PRODUCCION_REAL and ABA_MFUND for ADMIN when the catalog query fails', async () => {
		vi.mocked(prisma.reportDefinition.findMany).mockRejectedValue(
			new Error('table missing')
		)

		const result = await getAuthorizedReportCodes({
			roleCode: UserRole.ADMIN,
			idCategory: null,
		})
		expect(result.codes).toEqual(Object.values(REPORT_CODES))
		expect(result.codes).toContain('PRODUCCION_REAL')
		expect(result.codes).toContain('ABA_MFUND')
	})

	it('returns ABA_MFUND for Performance Leader when the category permission is active', async () => {
		vi.mocked(prisma.categoryReportPermission.findMany).mockResolvedValue([
			{ report: { code: REPORT_CODES.ABA_MFUND } },
		] as never)

		const result = await getAuthorizedReportCodes({
			roleCode: UserRole.AGENTE,
			idCategory: 4,
		})
		expect(result.codes).toEqual([REPORT_CODES.ABA_MFUND])
		expect(prisma.reportDefinition.findMany).not.toHaveBeenCalled()
	})

	it('returns ABA_MFUND for Business Leader when the category permission is active', async () => {
		vi.mocked(prisma.categoryReportPermission.findMany).mockResolvedValue([
			{ report: { code: REPORT_CODES.ABA_MFUND } },
		] as never)

		const result = await getAuthorizedReportCodes({
			roleCode: UserRole.AGENTE,
			idCategory: 5,
		})
		expect(result.codes).toContain(REPORT_CODES.ABA_MFUND)
	})

	it('does not return ABA_MFUND for an unauthorized category', async () => {
		vi.mocked(prisma.categoryReportPermission.findMany).mockResolvedValue(
			[] as never
		)

		const result = await getAuthorizedReportCodes({
			roleCode: UserRole.AGENTE,
			idCategory: 1,
		})
		expect(result.codes).not.toContain(REPORT_CODES.ABA_MFUND)
		expect(result.codes).toEqual([])
	})
})
