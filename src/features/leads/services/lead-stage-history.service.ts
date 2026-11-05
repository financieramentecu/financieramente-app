import * as Sentry from '@sentry/nextjs'
import type { LeadStageChangeSource } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { shouldRecordStageChange } from '@/features/leads/lib/should-record-stage-change'

export interface RecordLeadStageChangeInput {
	idLead: number
	/** `undefined`/`null` when the lead was just created. */
	fromIdLeadFunnelColumn: number | null | undefined
	toIdLeadFunnelColumn: number
	source: LeadStageChangeSource
	/** Acting user; omitted for system sources (webhook). */
	idUser?: number | null
	changedAt: Date
}

/**
 * Appends a `LeadStageHistory` row when the funnel column changed.
 * Never throws: history is secondary to the lead sync, so failures are
 * reported to Sentry and the caller keeps processing.
 */
export async function recordLeadStageChange(
	input: RecordLeadStageChangeInput
): Promise<void> {
	if (!shouldRecordStageChange(input.fromIdLeadFunnelColumn, input.toIdLeadFunnelColumn)) {
		return
	}

	try {
		await prisma.leadStageHistory.create({
			data: {
				idLead: input.idLead,
				fromIdLeadFunnelColumn: input.fromIdLeadFunnelColumn ?? null,
				toIdLeadFunnelColumn: input.toIdLeadFunnelColumn,
				source: input.source,
				idUser: input.idUser ?? null,
				changedAt: input.changedAt,
			},
		})
	} catch (error) {
		Sentry.captureException(error)
	}
}
