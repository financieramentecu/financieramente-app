import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		reportDefinition: {
			findFirst: vi.fn(),
		},
		category: {
			findMany: vi.fn(),
		},
		categoryReportPermission: {
			findMany: vi.fn(),
			upsert: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		$transaction: vi.fn(),
	},
}))

import { prisma } from '@/lib/prisma'
import { replaceReportPermissions } from '@/features/report-permissions/services/report-permissions.service'

describe('replaceReportPermissions soft delete', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('upserts enabled categories and soft-disables removed ones without delete()', async () => {
		vi.mocked(prisma.reportDefinition.findFirst).mockResolvedValue({
			id: 10,
			code: 'PRODUCCION_REAL',
			name: 'Producción Real',
			description: null,
			routePath: '/dashboard/reportes/produccion-real',
			status: true,
		} as never)

		vi.mocked(prisma.category.findMany)
			.mockResolvedValueOnce([{ id: 4 }] as never)
			.mockResolvedValueOnce([{ id: 1, name: 'MS Junior' }, { id: 4, name: 'Performance Leader' }] as never)

		vi.mocked(prisma.categoryReportPermission.findMany)
			.mockResolvedValueOnce([
				{ id: 100, idReport: 10, idCategory: 1, status: true },
				{ id: 101, idReport: 10, idCategory: 4, status: true },
			] as never)
			.mockResolvedValueOnce([{ idCategory: 4 }] as never)

		vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
			const tx = {
				categoryReportPermission: {
					upsert: vi.fn().mockResolvedValue({}),
					update: vi.fn().mockResolvedValue({}),
					delete: vi.fn(),
				},
			}
			await fn(tx as never)
			expect(tx.categoryReportPermission.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						idReport_idCategory: { idReport: 10, idCategory: 4 },
					},
					update: { status: true },
				})
			)
			expect(tx.categoryReportPermission.update).toHaveBeenCalledWith({
				where: { id: 100 },
				data: { status: false },
			})
			expect(tx.categoryReportPermission.delete).not.toHaveBeenCalled()
			return undefined
		})

		const matrix = await replaceReportPermissions('PRODUCCION_REAL', [4])
		expect(matrix.report.code).toBe('PRODUCCION_REAL')
		expect(prisma.categoryReportPermission.delete).not.toHaveBeenCalled()
	})
})
