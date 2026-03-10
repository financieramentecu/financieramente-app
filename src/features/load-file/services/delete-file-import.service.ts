import { prisma } from '@/lib/prisma'
import type { DeleteFileImportResult } from '../types/load-file.types'

const INVALID_STATUS_MESSAGE =
	'Solo se puede eliminar un archivo en estado LOAD o ERROR. El archivo está pre-liquidado o liquidado.'

/**
 * Deletes a file import and all dependent records only when status is LOAD or ERROR.
 * Validates ownership and status; performs deletes in FK-safe order within a single transaction.
 */
export async function deleteFileImport(
	fileImportId: number,
	idUser: number
): Promise<DeleteFileImportResult> {
	const fileImport = await prisma.fileImport.findFirst({
		where: {
			idFileImport: fileImportId,
			idUser,
		},
		select: { idFileImport: true, status: true },
	})

	if (!fileImport) {
		return {
			ok: false,
			code: 'NOT_FOUND',
			message: 'FileImport no encontrado o no autorizado',
		}
	}

	if (fileImport.status !== 'LOAD' && fileImport.status !== 'ERROR') {
		return {
			ok: false,
			code: 'INVALID_STATUS',
			message: INVALID_STATUS_MESSAGE,
		}
	}

	await prisma.$transaction(async (tx) => {
		// Re-verify existence inside transaction to avoid P2025
		const existing = await tx.fileImport.findUnique({
			where: { idFileImport: fileImportId },
			select: { idFileImport: true },
		})
		if (!existing) {
			throw new Error('NOT_FOUND')
		}

		const settlements = await tx.settlementCommission.findMany({
			where: { idFileImport: fileImportId },
			select: { idSettlementCommission: true },
		})
		const settlementIds = settlements.map((s) => s.idSettlementCommission)

		if (settlementIds.length > 0) {
			const distributions = await tx.comissionDistribution.findMany({
				where: { idSettlementCommission: { in: settlementIds } },
				select: { idComissionDistribution: true },
			})
			const distributionIds = distributions.map((d) => d.idComissionDistribution)

			if (distributionIds.length > 0) {
				await tx.clawback.deleteMany({
					where: { idComissionDistribution: { in: distributionIds } },
				})
			}
			await tx.comissionDistribution.deleteMany({
				where: { idSettlementCommission: { in: settlementIds } },
			})
		}

		await tx.settlementCommission.deleteMany({
			where: { idFileImport: fileImportId },
		})
		await tx.fileImportError.deleteMany({
			where: { idFileImport: fileImportId },
		})
		// deleteMany avoids P2025 when relations are already removed
		await tx.fileImport.deleteMany({
			where: { idFileImport: fileImportId },
		})
	})

	return { ok: true }
}
