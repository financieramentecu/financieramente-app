import type { Prisma, PrismaClient } from '@prisma/client'
import { EXCLUDED_SETTLEMENT_STATUS } from '../lib/distribution-exclusion'

type Db =
	| Pick<PrismaClient, 'settlementCommission' | 'fileImport'>
	| Prisma.TransactionClient

/**
 * Converts a settlement row of a partner business into EXCLUDED (PL-01, PL-03).
 * The row is kept for traceability; it never gets distribution rows.
 */
export async function markSettlementExcluded(
	db: Db,
	idSettlementCommission: number,
	options: { idBusiness?: number } = {}
): Promise<void> {
	await db.settlementCommission.update({
		where: { idSettlementCommission },
		data: {
			status: EXCLUDED_SETTLEMENT_STATUS,
			isLag: false,
			...(options.idBusiness !== undefined
				? { idBusiness: options.idBusiness }
				: {}),
		},
	})
}

/** Number of EXCLUDED rows in a file import. */
export async function countExcludedSettlements(
	db: Db,
	fileImportId: number
): Promise<number> {
	const count = await db.settlementCommission.count({
		where: { idFileImport: fileImportId, status: EXCLUDED_SETTLEMENT_STATUS },
	})
	return count ?? 0
}

/**
 * Returns the number of EXCLUDED rows of the file when none of the pending
 * statuses has rows left (the remaining work is only partner rows, PL-02);
 * returns 0 when pending work remains or there is nothing excluded.
 */
export async function countExcludedWhenNoPendingWork(
	db: Db,
	fileImportId: number,
	pendingStatuses: readonly string[]
): Promise<number> {
	for (const status of pendingStatuses) {
		const pending = await db.settlementCommission.count({
			where: { idFileImport: fileImportId, status },
		})
		if ((pending ?? 0) > 0) return 0
	}
	return (await countExcludedSettlements(db, fileImportId)) ?? 0
}

/**
 * Partner-only file (no SYNCHRONIZED backlog, at least one EXCLUDED row):
 * moves the import to PRE-SETTLED so it does not stay stuck in LOAD (PL-02).
 * Returns the number of excluded rows, or 0 when nothing was changed.
 */
export async function advanceExcludedOnlyFileToPreSettled(
	db: Db,
	fileImportId: number
): Promise<number> {
	const excluded = await countExcludedWhenNoPendingWork(db, fileImportId, [
		'SYNCHRONIZED',
	])
	if (excluded === 0) return 0
	const now = new Date()
	await db.fileImport.update({
		where: { idFileImport: fileImportId },
		data: { status: 'PRE-SETTLED', preLiquidacionDate: now, updatedAt: now },
	})
	return excluded
}

/**
 * Partner-only file already PRE-SETTLED (no SYNCHRONIZED and no PRE-SETTLED
 * rows, at least one EXCLUDED row): closes it as SETTLED, the same terminal
 * state a distributed file reaches before notification (PL-02).
 * Returns the number of excluded rows, or 0 when nothing was changed.
 */
export async function settleExcludedOnlyFile(
	db: Db,
	fileImportId: number
): Promise<number> {
	const excluded = await countExcludedWhenNoPendingWork(db, fileImportId, [
		'SYNCHRONIZED',
		'PRE-SETTLED',
	])
	if (excluded === 0) return 0
	await db.fileImport.update({
		where: { idFileImport: fileImportId },
		data: { status: 'SETTLED', updatedAt: new Date() },
	})
	return excluded
}
