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
		expect(result.codes).toEqual(['PRODUCCION_REAL'])
	})

	it('still returns PRODUCCION_REAL for ADMIN when the catalog is empty', async () => {
		vi.mocked(prisma.reportDefinition.findMany).mockResolvedValue([] as never)

		const result = await getAuthorizedReportCodes({
			roleCode: UserRole.ADMIN,
			idCategory: null,
		})
		expect(result.codes).toEqual(['PRODUCCION_REAL'])
	})

	it('still returns PRODUCCION_REAL for ADMIN when the catalog query fails', async () => {
		vi.mocked(prisma.reportDefinition.findMany).mockRejectedValue(
			new Error('table missing')
		)

		const result = await getAuthorizedReportCodes({
			roleCode: UserRole.ADMIN,
			idCategory: null,
		})
		expect(result.codes).toEqual(['PRODUCCION_REAL'])
	})
})
