import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import {
	obtenerMisArchivosConDistribucion,
	obtenerReciboDistribucion,
	registrarAprobacionDistribucion,
	contarAprobacionesArchivo,
} from '../services/mis-distribuciones.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		comissionDistribution: { findMany: vi.fn(), count: vi.fn() },
		fileImport: { findFirst: vi.fn() },
		distributionApproval: { count: vi.fn(), upsert: vi.fn() },
	},
}))

vi.mock('@/features/auth/lib/hierarchy', () => ({
	canViewUserDistributions: vi.fn().mockResolvedValue(true),
	isHierarchyBypassRole: vi.fn().mockReturnValue(false),
}))

const activeOnly = { isActive: true }
const notDeletedFile = { fileImport: { status: { not: 'DELETED' } } }

describe('mis-distribuciones: soft-deleted file imports', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('lists only active distributions of non-deleted files', async () => {
		vi.mocked(prisma.comissionDistribution.findMany).mockResolvedValue([])

		await obtenerMisArchivosConDistribucion(7)

		expect(prisma.comissionDistribution.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					idBeneficiaryUser: 7,
					...activeOnly,
					settlementCommission: notDeletedFile,
				}),
			})
		)
	})

	it('returns no receipt when the file import is deleted', async () => {
		vi.mocked(prisma.fileImport.findFirst).mockResolvedValue(null)

		const result = await obtenerReciboDistribucion({
			fileImportId: 5,
			viewerId: 7,
			viewerRole: 'AGENTE' as never,
		})

		expect(result).toBeNull()
		expect(prisma.fileImport.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					idFileImport: 5,
					status: { not: 'DELETED' },
				},
			})
		)
		expect(prisma.comissionDistribution.findMany).not.toHaveBeenCalled()
	})

	it('refuses to approve a file with no active distributions', async () => {
		vi.mocked(prisma.comissionDistribution.count).mockResolvedValue(0)

		await expect(
			registrarAprobacionDistribucion({ fileImportId: 5, idUser: 7 })
		).rejects.toThrow('No hay distribuciones para aprobar')

		expect(prisma.comissionDistribution.count).toHaveBeenCalledWith({
			where: expect.objectContaining({
				...activeOnly,
				settlementCommission: expect.objectContaining(notDeletedFile),
			}),
		})
		expect(prisma.distributionApproval.upsert).not.toHaveBeenCalled()
	})

	it('counts only active beneficiaries for approvals', async () => {
		vi.mocked(prisma.comissionDistribution.findMany).mockResolvedValue([])
		vi.mocked(prisma.distributionApproval.count).mockResolvedValue(0)

		await contarAprobacionesArchivo(5)

		expect(prisma.comissionDistribution.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining(activeOnly),
			})
		)
	})
})
