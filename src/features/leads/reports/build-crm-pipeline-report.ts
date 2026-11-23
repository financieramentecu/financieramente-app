import { Prisma } from '@prisma/client'
import type {
	CrmPipelineReport,
	CrmReportBreakdownRow,
	CrmReportDataset,
	CrmReportForecast,
	CrmReportFunnelStage,
	CrmReportLead,
	CrmReportOutcomes,
	CrmReportOwner,
	CrmReportStage,
	CrmReportStageChange,
	CrmReportStageDuration,
} from '@/features/leads/reports/crm-pipeline-report.types'

const DAY_MS = 24 * 60 * 60 * 1000
const ZERO = new Prisma.Decimal(0)

const ORIGIN_NONE = { key: 'none', label: 'Sin origen' } as const
const UNASSIGNED = { key: 'unassigned', label: 'Sin asignar' } as const
const NO_LEADER = { key: 'no-leader', label: 'Sin líder' } as const

function ratio(numerator: number, denominator: number): number | null {
	if (denominator === 0) return null
	return Math.round((numerator / denominator) * 10_000) / 10_000
}

function oneDecimal(value: number): number {
	return Math.round(value * 10) / 10
}

function toAmount(value: Prisma.Decimal): string {
	return value.toDecimalPlaces(2).toString()
}

function valueOf(lead: CrmReportLead): Prisma.Decimal | null {
	return lead.estimatedValue === null ? null : new Prisma.Decimal(lead.estimatedValue)
}

function weightedOf(value: Prisma.Decimal, probability: number | null): Prisma.Decimal {
	return value.mul(probability ?? 0).div(100)
}

function byPosition(left: CrmReportStage, right: CrmReportStage): number {
	return left.position - right.position || left.idLeadFunnelColumn - right.idLeadFunnelColumn
}

/** Active, non-fallback stages in board order: the stages a funnel is made of. */
function funnelStages(stages: readonly CrmReportStage[]): CrmReportStage[] {
	return stages.filter((stage) => stage.active && !stage.isFallback).sort(byPosition)
}

function groupChangesByLead(changes: readonly CrmReportStageChange[]): Map<number, CrmReportStageChange[]> {
	const grouped = new Map<number, CrmReportStageChange[]>()
	for (const change of changes) {
		const list = grouped.get(change.idLead) ?? []
		list.push(change)
		grouped.set(change.idLead, list)
	}
	for (const list of grouped.values()) list.sort((left, right) => left.changedAt.getTime() - right.changedAt.getTime())
	return grouped
}

function summarizeOutcomes(leads: readonly CrmReportLead[]): CrmReportOutcomes {
	const count = (status: CrmReportLead['outcomeStatus']) => leads.filter((lead) => lead.outcomeStatus === status).length
	const won = count('WON')
	const lost = count('LOST')
	const abandoned = count('ABANDONED')
	return {
		total: leads.length,
		open: count('OPEN'),
		won,
		lost,
		abandoned,
		winRate: ratio(won, won + lost + abandoned),
		conversionRate: ratio(won, leads.length),
	}
}

function buildFunnel(
	leads: readonly CrmReportLead[],
	changesByLead: Map<number, CrmReportStageChange[]>,
	stages: readonly CrmReportStage[]
): CrmReportFunnelStage[] {
	const rankById = new Map(stages.map((stage, rank) => [stage.idLeadFunnelColumn, rank]))
	const reached = stages.map(() => 0)
	for (const lead of leads) {
		const visited = [lead.idLeadFunnelColumn]
		for (const change of changesByLead.get(lead.idLead) ?? []) {
			if (change.fromIdLeadFunnelColumn !== null) visited.push(change.fromIdLeadFunnelColumn)
			visited.push(change.toIdLeadFunnelColumn)
		}
		const ranks = visited.flatMap((id) => (rankById.has(id) ? [rankById.get(id)!] : []))
		if (ranks.length === 0) continue
		const furthest = Math.max(...ranks)
		for (let rank = 0; rank <= furthest; rank += 1) reached[rank]! += 1
	}
	return stages.map((stage, rank) => ({
		idLeadFunnelColumn: stage.idLeadFunnelColumn,
		name: stage.name,
		reached: reached[rank]!,
		conversionFromPrevious: rank === 0 ? null : ratio(reached[rank]!, reached[rank - 1]!),
	}))
}

/** Completed stays (stage → days) of one lead; the current, open stay is never included. */
function completedStays(lead: CrmReportLead, changes: readonly CrmReportStageChange[]): Array<[number, number]> {
	const stays: Array<[number, number]> = []
	const first = changes[0]
	if (first && first.fromIdLeadFunnelColumn !== null) {
		stays.push([first.fromIdLeadFunnelColumn, first.changedAt.getTime() - lead.createdAt.getTime()])
	}
	for (let index = 0; index < changes.length - 1; index += 1) {
		const change = changes[index]!
		stays.push([change.toIdLeadFunnelColumn, changes[index + 1]!.changedAt.getTime() - change.changedAt.getTime()])
	}
	return stays.filter(([, ms]) => ms >= 0)
}

function median(sorted: readonly number[]): number {
	const middle = Math.floor(sorted.length / 2)
	return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

function buildStageDurations(
	leads: readonly CrmReportLead[],
	changesByLead: Map<number, CrmReportStageChange[]>,
	stages: readonly CrmReportStage[]
): CrmReportStageDuration[] {
	const daysByStage = new Map<number, number[]>(stages.map((stage) => [stage.idLeadFunnelColumn, []]))
	for (const lead of leads) {
		for (const [idStage, ms] of completedStays(lead, changesByLead.get(lead.idLead) ?? [])) {
			daysByStage.get(idStage)?.push(ms / DAY_MS)
		}
	}
	return stages.map((stage) => {
		const days = [...(daysByStage.get(stage.idLeadFunnelColumn) ?? [])].sort((left, right) => left - right)
		const total = days.reduce((sum, value) => sum + value, 0)
		return {
			idLeadFunnelColumn: stage.idLeadFunnelColumn,
			name: stage.name,
			samples: days.length,
			averageDays: days.length ? oneDecimal(total / days.length) : null,
			medianDays: days.length ? oneDecimal(median(days)) : null,
		}
	})
}

interface BucketKey {
	readonly key: string
	readonly label: string
}

function breakdown(leads: readonly CrmReportLead[], keyOf: (lead: CrmReportLead) => BucketKey): CrmReportBreakdownRow[] {
	const buckets = new Map<string, { label: string; leads: CrmReportLead[] }>()
	for (const lead of leads) {
		const { key, label } = keyOf(lead)
		const bucket = buckets.get(key) ?? { label, leads: [] }
		bucket.leads.push(lead)
		buckets.set(key, bucket)
	}
	return [...buckets.entries()]
		.map(([key, bucket]) => {
			const outcomes = summarizeOutcomes(bucket.leads)
			let estimated = ZERO
			let weighted = ZERO
			for (const lead of bucket.leads) {
				const value = valueOf(lead)
				if (!value) continue
				estimated = estimated.add(value)
				weighted = weighted.add(weightedOf(value, lead.probability))
			}
			return {
				key,
				label: bucket.label,
				total: outcomes.total,
				open: outcomes.open,
				won: outcomes.won,
				lost: outcomes.lost + outcomes.abandoned,
				winRate: outcomes.winRate,
				estimatedValue: toAmount(estimated),
				weightedValue: toAmount(weighted),
			}
		})
		.sort((left, right) => right.total - left.total || left.label.localeCompare(right.label, 'es'))
}

function originKey(lead: CrmReportLead): BucketKey {
	const origin = lead.originTag?.trim()
	return origin ? { key: origin, label: origin } : ORIGIN_NONE
}

function advisorKey(owners: Map<number, CrmReportOwner>) {
	return (lead: CrmReportLead): BucketKey => {
		if (lead.idUser === null) return UNASSIGNED
		const owner = owners.get(lead.idUser)
		return { key: String(lead.idUser), label: owner?.name ?? `Usuario ${lead.idUser}` }
	}
}

function teamKey(owners: Map<number, CrmReportOwner>) {
	return (lead: CrmReportLead): BucketKey => {
		if (lead.idUser === null) return UNASSIGNED
		const owner = owners.get(lead.idUser)
		if (!owner || owner.idLeader === null) return NO_LEADER
		return { key: String(owner.idLeader), label: owner.leaderName ?? `Usuario ${owner.idLeader}` }
	}
}

function buildForecast(leads: readonly CrmReportLead[], stages: readonly CrmReportStage[]): CrmReportForecast {
	const order = new Map([...stages].sort(byPosition).map((stage, rank) => [stage.idLeadFunnelColumn, rank]))
	const names = new Map(stages.map((stage) => [stage.idLeadFunnelColumn, stage.name]))
	const rows = new Map<number, { openLeads: number; valuedLeads: number; estimated: Prisma.Decimal; weighted: Prisma.Decimal }>()
	for (const lead of leads) {
		if (lead.outcomeStatus !== 'OPEN') continue
		const row = rows.get(lead.idLeadFunnelColumn) ?? { openLeads: 0, valuedLeads: 0, estimated: ZERO, weighted: ZERO }
		row.openLeads += 1
		const value = valueOf(lead)
		if (value) {
			row.valuedLeads += 1
			row.estimated = row.estimated.add(value)
			row.weighted = row.weighted.add(weightedOf(value, lead.probability))
		}
		rows.set(lead.idLeadFunnelColumn, row)
	}
	const rank = (id: number) => order.get(id) ?? Number.MAX_SAFE_INTEGER
	const sortedIds = [...rows.keys()].sort((left, right) => rank(left) - rank(right) || left - right)
	const totals = { openLeads: 0, valuedLeads: 0, estimated: ZERO, weighted: ZERO }
	const stageRows = sortedIds.map((id) => {
		const row = rows.get(id)!
		totals.openLeads += row.openLeads
		totals.valuedLeads += row.valuedLeads
		totals.estimated = totals.estimated.add(row.estimated)
		totals.weighted = totals.weighted.add(row.weighted)
		return {
			idLeadFunnelColumn: id,
			name: names.get(id) ?? `Etapa ${id}`,
			openLeads: row.openLeads,
			valuedLeads: row.valuedLeads,
			estimatedValue: toAmount(row.estimated),
			weightedValue: toAmount(row.weighted),
		}
	})
	return {
		stages: stageRows,
		totals: {
			openLeads: totals.openLeads,
			valuedLeads: totals.valuedLeads,
			estimatedValue: toAmount(totals.estimated),
			weightedValue: toAmount(totals.weighted),
		},
	}
}

/** Pipeline report (Odoo pipeline analysis): pure, aggregate-only, computed from a bounded dataset. */
export function buildCrmPipelineReport(dataset: CrmReportDataset): CrmPipelineReport {
	const stages = funnelStages(dataset.stages)
	const changesByLead = groupChangesByLead(dataset.stageChanges)
	const owners = new Map(dataset.owners.map((owner) => [owner.idUser, owner]))
	return {
		range: dataset.range,
		outcomes: summarizeOutcomes(dataset.leads),
		funnel: buildFunnel(dataset.leads, changesByLead, stages),
		stageDurations: buildStageDurations(dataset.leads, changesByLead, stages),
		byOrigin: breakdown(dataset.leads, originKey),
		byAdvisor: breakdown(dataset.leads, advisorKey(owners)),
		byTeam: breakdown(dataset.leads, teamKey(owners)),
		forecast: buildForecast(dataset.leads, dataset.stages),
	}
}
