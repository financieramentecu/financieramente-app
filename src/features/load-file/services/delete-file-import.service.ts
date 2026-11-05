import { prisma } from '@/lib/prisma'
import type { DeleteFileImportResult } from '../types/load-file.types'
import { FILE_IMPORT_STATUS_DELETED } from '../lib/file-import-status'

const INVALID_STATUS_MESSAGE =
	'Solo se puede eliminar un archivo en estado LOAD o ERROR. El archivo está pre-liquidado o liquidado.'

/**
 * Logically deletes a file import (and everything loaded from it) only when its
 * status is LOAD or ERROR. No row is physically removed: the file import and its
 * settlements move to status DELETED, distributions are deactivated and
 * clawbacks are marked DELETED, all within a single transaction. Import errors
 * are kept as history and are only reachable through the (hidden) file import.
 */
export async function deleteFileImport(
	fileImportId: number,
	idUser: number
): Promise<DeleteFileImportResult> {
	const fileImport = await prisma.fileImport.findFirst({
		where: {
			idFileImport: fileImportId,
			idUser,
			status: { not: FILE_IMPORT_STATUS_DELETED },
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
			const distributionIds = distributions.map(
				(d) => d.idComissionDistribution
			)

			if (distributionIds.length > 0) {
				await tx.clawback.updateMany({
					where: { idComissionDistribution: { in: distributionIds } },
					data: { state: FILE_IMPORT_STATUS_DELETED },
				})
			}
			await tx.comissionDistribution.updateMany({
				where: { idSettlementCommission: { in: settlementIds } },
				data: { isActive: false },
			})
		}

		await tx.settlementCommission.updateMany({
			where: { idFileImport: fileImportId },
			data: { status: FILE_IMPORT_STATUS_DELETED },
		})
		await tx.fileImport.updateMany({
			where: { idFileImport: fileImportId },
			data: { status: FILE_IMPORT_STATUS_DELETED },
		})
	})

	return { ok: true }
}
