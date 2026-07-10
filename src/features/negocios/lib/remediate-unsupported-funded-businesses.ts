/**
 * Core logic for `scripts/remediate-unsupported-funded-businesses.ts`.
 * Identifies businesses that reached `FONDEADO` before the support-count
 * validation existed (zero active `BusinessSupport` rows) and reverts them.
 *
 * Kept as a pure, injectable-Prisma module (not the script itself) so it can
 * be unit tested under the project's standard `src/**\/*.test.ts` glob.
 */

import type { PrismaClient } from '@prisma/client'
import { AuditAction } from '../../auth/lib/audit-logger'

type Prisma = Pick<PrismaClient, 'business' | '$transaction'>

export interface AffectedBusiness {
	idBusiness: number
	status: string | null
	contract: string | null
}

export interface RemediationOptions {
	apply: boolean
	operatorEmail?: string
}

export interface RemediationSummary {
	businessesReverted: number
	paymentsReverted: number
	businessIds: number[]
}

/**
 * Businesses with `status = FONDEADO` and zero ACTIVE (`status: true`)
 * `BusinessSupport` rows.
 */
export async function findAffectedBusinesses(
	prisma: Prisma
): Promise<AffectedBusiness[]> {
	return prisma.business.findMany({
		where: {
			status: 'FONDEADO',
			supports: { none: { status: true } },
		},
		select: {
			idBusiness: true,
			status: true,
			contract: true,
		},
	})
}

/**
 * Dry-run (default) reports the affected set without mutating anything.
 * `--apply` reverts each affected business atomically: status → EMITIDO,
 * dateAnchored → null, all its Payment rows → SIN_FONDEAR / dateAnchored
 * null, and logs a BUSINESS_REMEDIATION_REVERTED AuditLog entry per business.
 */
export async function runRemediation(
	prisma: Prisma,
	options: RemediationOptions
): Promise<RemediationSummary> {
	const affected = await findAffectedBusinesses(prisma)

	if (!options.apply) {
		return {
			businessesReverted: 0,
			paymentsReverted: 0,
			businessIds: affected.map((b) => b.idBusiness),
		}
	}

	let paymentsReverted = 0

	for (const business of affected) {
		await prisma.$transaction(async (tx) => {
			await tx.business.update({
				where: { idBusiness: business.idBusiness },
				data: { status: 'EMITIDO', dateAnchored: null },
			})

			const paymentResult = await tx.payment.updateMany({
				where: { idBusiness: business.idBusiness },
				data: { status: 'SIN_FONDEAR', dateAnchored: null },
			})
			paymentsReverted += paymentResult.count

			await tx.auditLog.create({
				data: {
					action: AuditAction.BUSINESS_REMEDIATION_REVERTED,
					email: options.operatorEmail,
					details: JSON.stringify({
						businessId: business.idBusiness,
						contract: business.contract,
						previousStatus: business.status,
						operator: options.operatorEmail ?? null,
						timestamp: new Date().toISOString(),
					}),
				},
			})
		})
	}

	return {
		businessesReverted: affected.length,
		paymentsReverted,
		businessIds: affected.map((b) => b.idBusiness),
	}
}
