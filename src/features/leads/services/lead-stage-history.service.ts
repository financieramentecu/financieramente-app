import * as Sentry from '@sentry/nextjs'
import type { LeadStageChangeSource } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buildStageStays } from '@/features/leads/lib/build-stage-stays'
import { shouldRecordStageChange } from '@/features/leads/lib/should-record-stage-change'
import type { LeadStageStayDto } from '@/features/leads/types/lead-stage-stay.types'

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
	if (
		!shouldRecordStageChange(
			input.fromIdLeadFunnelColumn,
			input.toIdLeadFunnelColumn
		)
	) {
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

/**
 * Full stage history for one lead, with dwell time derived from consecutive
 * changes. Returns an empty list when the lead does not exist.
 */
export async function getLeadStageStays(
	idLead: number,
	now: Date = new Date()
): Promise<LeadStageStayDto[]> {
	const lead = await prisma.lead.findUnique({
		where: { idLead },
		select: {
			createdAt: true,
			funnelColumn: { select: { name: true } },
			stageHistory: {
				orderBy: { changedAt: 'asc' },
				select: {
					changedAt: true,
					fromColumn: { select: { name: true } },
					toColumn: { select: { name: true } },
				},
			},
		},
	})
	if (!lead) return []

	return buildStageStays({
		createdAt: lead.createdAt,
		currentColumnName: lead.funnelColumn.name,
		now,
		events: lead.stageHistory.map((event) => ({
			fromColumnName: event.fromColumn?.name ?? null,
			toColumnName: event.toColumn.name,
			changedAt: event.changedAt,
		})),
	}).map((stay) => ({
		columnName: stay.columnName,
		enteredAt: stay.enteredAt.toISOString(),
		leftAt: stay.leftAt ? stay.leftAt.toISOString() : null,
		durationMs: stay.durationMs,
		current: stay.current,
	}))
}
