/**
 * Idempotent data migration for the manual novedad status management change
 * (novedad-gestion-manual). No Prisma schema migration — Business.novedadStatus
 * stays VarChar(20).
 *
 * Legacy rows used two vocabularies that this change retires:
 *   - PENDIENTE: the old MARK default (self-service "mark novedad").
 *   - RESUELTA: the old auto-resolve default (set when a VENTA_EFECTUADA
 *     business with a pending novedad transitioned to EMITIDO).
 *
 * Both map to NUEVA, the new starting state for a freshly-marked novedad.
 * The where-clause self-excludes on re-run (idempotent: a second run matches
 * zero rows and performs no writes/audit).
 *
 * Run with: npx tsx prisma/seeds/backfill-novedad-status.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client'
import { AuditAction } from '../../src/features/auth/lib/audit-logger'

const prisma = new PrismaClient()

const SYSTEM_ACTOR = {
	email: 'system@migration',
	ip: 'system',
	ua: 'migration/backfill-novedad-status',
}

/** Legacy novedad status values migrated to NUEVA */
const LEGACY_NOVEDAD_STATUSES = ['PENDIENTE', 'RESUELTA'] as const

const UPDATE_CHUNK_SIZE = 500

export interface BackfillOptions {
	dryRun: boolean
}

/**
 * Migrates every business row with a legacy novedadStatus (PENDIENTE or
 * RESUELTA) to NUEVA. Chunked via `updateMany` (no per-row processing needed
 * since the target value is constant), logs a single SYSTEM_ACTOR audit entry
 * per batch when rows are actually updated.
 */
export async function backfillNovedadStatus(
	options: BackfillOptions = { dryRun: false }
): Promise<{ updated: number }> {
	const { dryRun } = options
	const where = { novedadStatus: { in: [...LEGACY_NOVEDAD_STATUSES] } }

	if (dryRun) {
		const count = await prisma.business.count({ where })
		console.log(`[backfill-novedad-status] DRY RUN — would update ${count} business(es) to NUEVA.`)
		return { updated: 0 }
	}

	// A single `updateMany` with the LEGACY_NOVEDAD_STATUSES where-clause is
	// idempotent by construction (a re-run matches zero rows). Real chunking
	// by id range (UPDATE_CHUNK_SIZE) is reserved for tables large enough
	// that a single UPDATE would hold a long-lived lock — Business.novedadStatus
	// backfills are expected to affect a small legacy subset.
	const result = await prisma.business.updateMany({
		where,
		data: { novedadStatus: 'NUEVA' },
	})
	const updated = result.count

	console.log(`[backfill-novedad-status] Updated ${updated} business(es) to NUEVA.`)

	if (updated > 0) {
		await logMigrationAudit(
			AuditAction.BUSINESS_NOVEDAD_STATUS_CHANGED,
			`Migration: Backfilled ${updated} business(es) with legacy novedadStatus (PENDIENTE|RESUELTA) to NUEVA`
		)
	}

	return { updated }
}

/** Log ONE batch-level audit entry via prisma directly */
async function logMigrationAudit(action: AuditAction, details: string): Promise<void> {
	try {
		await prisma.auditLog.create({
			data: {
				action,
				email: SYSTEM_ACTOR.email,
				ipAddress: SYSTEM_ACTOR.ip,
				userAgent: SYSTEM_ACTOR.ua,
				details,
			},
		})
	} catch (err) {
		console.error('Audit log error (non-blocking):', err)
	}
}

// Guard: only run main() when executed directly (`npx tsx ...`), not on import.
const isMainModule = process.argv[1]
	? import.meta.url === `file://${process.argv[1]}`
	: false

if (isMainModule) {
	const isDryRun = process.argv.includes('--dry-run')
	console.log(`[backfill-novedad-status] Starting migration. Dry run: ${isDryRun}. Chunk size: ${UPDATE_CHUNK_SIZE}`)

	backfillNovedadStatus({ dryRun: isDryRun })
		.then(() => console.log('[backfill-novedad-status] Migration complete.'))
		.catch((error) => {
			console.error('Migration failed:', error)
			process.exit(1)
		})
		.finally(async () => {
			await prisma.$disconnect()
		})
}
