/**
 * Pure aggregation for the Commercial Dashboard. No I/O: the service loads
 * rows, this builds the view. A lead "reached" a stage when it has a stage
 * event into it, or — for leads that predate the stage history — when its
 * current column sits at or beyond it in the funnel order.
 */

import { COMMERCIAL_DASHBOARD_UI } from './ui-copy'
import {
	NON_STUCK_STAGE_KEYS,
	ONE_DAY_MS,
	ONE_HOUR_MS,
	STAGE_KEY,
	STUCK_AFTER_DAYS,
	STUCK_LIST_LIMIT,
} from './stage-groups'
import { bogotaWeekStart, originLabel } from './origin-label'
import type {
	CommercialBusinessInput,
	CommercialColumnInput,
	CommercialDashboardReport,
	CommercialFunnelStep,
	CommercialKpis,
	CommercialLeadInput,
	CommercialMsRow,
	CommercialOriginPrevious,
	CommercialOriginRow,
	CommercialOwnerInput,
	CommercialPeriodTotals,
	CommercialPipelineOption,
	CommercialStageEventInput,
	CommercialStuckInput,
	CommercialStuckLead,
	CommercialWeeklyPoint,
} from '../types/commercial-dashboard.types'

export interface BuildCommercialReportInput {
	readonly leads: readonly CommercialLeadInput[]
	readonly events: readonly CommercialStageEventInput[]
	readonly columns: readonly CommercialColumnInput[]
	readonly owners: readonly CommercialOwnerInput[]
	readonly stuckCandidates: readonly CommercialStuckInput[]
	readonly pipelines?: readonly CommercialPipelineOption[]
	readonly unassigned?: number
	/** Businesses linked to the cohort's leads. */
	readonly businesses?: readonly CommercialBusinessInput[]
	/** Previous-period totals, computed by the service with buildPeriodTotals. */
	readonly previous?: CommercialPeriodTotals | null
	/** Leads of the previous period, for the per-origin comparison. */
	readonly previousLeads?: readonly CommercialLeadInput[]
	readonly now: Date
}

const FUNDED_STATUS = 'FONDEADO'
const CANCELLED_STATUS = 'CANCELADO'

interface LeadFacts {
	readonly lead: CommercialLeadInput
	/** Linked business, when the lead has one. */
	readonly business: CommercialBusinessInput | undefined
	readonly handled: boolean
	readonly contacted: boolean
	readonly contactedWithinHour: boolean | null
	readonly appointment: boolean
	readonly attended: boolean
	readonly noShow: boolean
	readonly proposal: boolean
}

function ratioOrNull(count: number, hasHistory: boolean): number | null {
	return hasHistory ? count : null
}

/**
 * Leads contacted within 1 h, out of the leads whose first contact has a
 * recorded time. Null when none has one: leads that predate the stage history
 * would otherwise read as "not contacted in time" (0%).
 */
function contactSpeed(
	list: readonly LeadFacts[],
	hasHistory: boolean
): { contactedWithinHour: number | null; contactTimed: number } {
	const contactTimed = count(list, (f) => f.contactedWithinHour !== null)
	return {
		contactedWithinHour:
			contactTimed > 0
				? ratioOrNull(count(list, (f) => f.contactedWithinHour === true), hasHistory)
				: null,
		contactTimed,
	}
}

function buildFacts(input: BuildCommercialReportInput): LeadFacts[] {
	const byKey = new Map(input.columns.map((c) => [c.externalStatusKey, c]))
	const byId = new Map(input.columns.map((c) => [c.idLeadFunnelColumn, c]))
	const position = (key: string): number =>
		byKey.get(key)?.position ?? Number.MAX_SAFE_INTEGER

	const eventsByLead = new Map<number, CommercialStageEventInput[]>()
	for (const event of input.events) {
		const list = eventsByLead.get(event.idLead) ?? []
		list.push(event)
		eventsByLead.set(event.idLead, list)
	}
	const businessById = new Map((input.businesses ?? []).map((b) => [b.idBusiness, b]))

	return input.leads.map((lead) => {
		const events = eventsByLead.get(lead.idLead) ?? []
		const current = byId.get(lead.idLeadFunnelColumn)
		const currentPos = current?.position ?? -1
		// "Cierre" also holds leads closed as lost from any stage: it says nothing
		// about how far they got, only their stage events do.
		const closedUnwon =
			current?.externalStatusKey === STAGE_KEY.CLOSED &&
			(lead.outcomeStatus === 'LOST' || lead.outcomeStatus === 'ABANDONED')
		const reachedPos = closedUnwon ? -1 : currentPos
		const eventKeys = new Set(
			events.map((e) => byId.get(e.toColumnId)?.externalStatusKey ?? '')
		)
		const sawKey = (key: string): boolean =>
			eventKeys.has(key) || current?.externalStatusKey === key
		const reachedFrom = (key: string): boolean =>
			reachedPos >= position(key) || eventKeys.has(key)

		const firstContact = events
			.filter(
				(e) =>
					byId.get(e.toColumnId)?.externalStatusKey === STAGE_KEY.FIRST_CONTACT
			)
			.map((e) => e.occurredAt.getTime())
			.sort((a, b) => a - b)[0]

		const contacted = reachedFrom(STAGE_KEY.FIRST_CONTACT)
		return {
			lead,
			business: lead.idBusiness != null ? businessById.get(lead.idBusiness) : undefined,
			// Left "Lead nuevo": the best "attended" signal, as in the weekly Sheet.
			handled: currentPos > position(STAGE_KEY.NEW),
			contacted,
			contactedWithinHour:
				firstContact === undefined
					? null
					: firstContact - lead.createdAt.getTime() <= ONE_HOUR_MS,
			appointment: reachedFrom(STAGE_KEY.APPOINTMENT),
			// Attended also covers leads already past the diagnostic (tasks, proposal…).
			attended: sawKey(STAGE_KEY.ATTENDED) || reachedPos >= position(STAGE_KEY.TASKS_PENDING),
			noShow: sawKey(STAGE_KEY.NO_SHOW),
			proposal: reachedFrom(STAGE_KEY.PROPOSAL),
		}
	})
}

function count(facts: readonly LeadFacts[], pick: (f: LeadFacts) => boolean) {
	return facts.reduce((acc, f) => acc + (pick(f) ? 1 : 0), 0)
}

const isWon = (f: LeadFacts) => f.lead.outcomeStatus === 'WON'
const hasBusiness = (f: LeadFacts) => f.lead.idBusiness != null
const isFunded = (f: LeadFacts) => f.business?.status === FUNDED_STATUS
const isCancelled = (f: LeadFacts) => f.business?.status === CANCELLED_STATUS

/** Rounded mean, or null for an empty list. */
function meanOrNull(values: readonly number[]): number | null {
	return values.length === 0
		? null
		: Math.round(values.reduce((a, v) => a + v, 0) / values.length)
}

/** Days from lead creation to `at`; null when unknown or before the lead. */
function daysFromLead(f: LeadFacts, at: Date | null | undefined): number | null {
	if (!at) return null
	const days = (at.getTime() - f.lead.createdAt.getTime()) / ONE_DAY_MS
	return days >= 0 ? days : null
}

/**
 * Totals for one period, used for the previous-period comparison. Same
 * definitions as the KPIs (won in the CRM, linked business, FONDEADO).
 */
export function buildPeriodTotals(
	range: { readonly dateFrom: string; readonly dateTo: string },
	leads: readonly CommercialLeadInput[],
	businesses: readonly CommercialBusinessInput[]
): CommercialPeriodTotals {
	const funded = new Set(
		businesses.filter((b) => b.status === FUNDED_STATUS).map((b) => b.idBusiness)
	)
	return {
		dateFrom: range.dateFrom,
		dateTo: range.dateTo,
		newLeads: leads.length,
		won: leads.filter((l) => l.outcomeStatus === 'WON').length,
		withBusiness: leads.filter((l) => l.idBusiness != null).length,
		funded: leads.filter((l) => l.idBusiness != null && funded.has(l.idBusiness)).length,
	}
}

function buildKpis(facts: readonly LeadFacts[], hasHistory: boolean): CommercialKpis {
	return {
		newLeads: facts.length,
		handled: count(facts, (f) => f.handled),
		contacted: count(facts, (f) => f.contacted),
		...contactSpeed(facts, hasHistory),
		appointments: count(facts, (f) => f.appointment),
		attended: count(facts, (f) => f.attended),
		noShow: count(facts, (f) => f.noShow),
		proposals: count(facts, (f) => f.proposal),
		won: count(facts, isWon),
		withBusiness: count(facts, hasBusiness),
		funded: count(facts, isFunded),
	}
}

function buildFunnel(kpis: CommercialKpis): CommercialFunnelStep[] {
	const ui = COMMERCIAL_DASHBOARD_UI
	return [
		{ key: 'new', label: ui.STAGE_NEW, count: kpis.newLeads },
		{ key: 'handled', label: ui.STAGE_HANDLED, count: kpis.handled },
		{ key: 'appointment', label: ui.STAGE_APPOINTMENT, count: kpis.appointments },
		{ key: 'attended', label: ui.STAGE_ATTENDED, count: kpis.attended },
		{ key: 'proposal', label: ui.STAGE_PROPOSAL, count: kpis.proposals },
	]
}

function buildStuck(input: BuildCommercialReportInput): {
	list: CommercialStuckLead[]
	total: number
	byOwner: Map<number | null, number>
} {
	const byId = new Map(input.columns.map((c) => [c.idLeadFunnelColumn, c]))
	const ownerName = new Map(input.owners.map((o) => [o.idUser, o.name]))
	const cutoff = input.now.getTime() - STUCK_AFTER_DAYS * ONE_DAY_MS

	const stuck = input.stuckCandidates
		.filter((c) => {
			const column = byId.get(c.idLeadFunnelColumn)
			return (
				c.updatedAt.getTime() <= cutoff &&
				!(column && NON_STUCK_STAGE_KEYS.includes(column.externalStatusKey))
			)
		})
		.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())

	const byOwner = new Map<number | null, number>()
	for (const s of stuck) byOwner.set(s.idUser, (byOwner.get(s.idUser) ?? 0) + 1)

	return {
		total: stuck.length,
		byOwner,
		list: stuck.slice(0, STUCK_LIST_LIMIT).map((s) => ({
			idLead: s.idLead,
			name: s.name || COMMERCIAL_DASHBOARD_UI.UNNAMED_LEAD,
			ownerName:
				(s.idUser != null ? ownerName.get(s.idUser) : undefined) ??
				COMMERCIAL_DASHBOARD_UI.UNASSIGNED_OWNER,
			stageName: byId.get(s.idLeadFunnelColumn)?.name ?? '',
			daysStuck: Math.floor((input.now.getTime() - s.updatedAt.getTime()) / ONE_DAY_MS),
		})),
	}
}

function buildMsRows(
	facts: readonly LeadFacts[],
	owners: readonly CommercialOwnerInput[],
	stuckByOwner: Map<number | null, number>,
	hasHistory: boolean
): CommercialMsRow[] {
	const names = new Map(owners.map((o) => [o.idUser, o.name]))
	const groups = new Map<number | null, LeadFacts[]>()
	for (const f of facts) {
		const list = groups.get(f.lead.idUser) ?? []
		list.push(f)
		groups.set(f.lead.idUser, list)
	}
	for (const idUser of stuckByOwner.keys()) {
		if (!groups.has(idUser)) groups.set(idUser, [])
	}

	return [...groups.entries()]
		.map(([idUser, list]) => ({
			idUser,
			ownerName:
				(idUser != null ? names.get(idUser) : undefined) ??
				COMMERCIAL_DASHBOARD_UI.UNASSIGNED_OWNER,
			leads: list.length,
			handled: count(list, (f) => f.handled),
			contacted: count(list, (f) => f.contacted),
			...contactSpeed(list, hasHistory),
			appointments: count(list, (f) => f.appointment),
			attended: count(list, (f) => f.attended),
			noShow: count(list, (f) => f.noShow),
			stuck: stuckByOwner.get(idUser) ?? 0,
			won: count(list, isWon),
			withBusiness: count(list, hasBusiness),
			funded: count(list, isFunded),
			cancelled: count(list, isCancelled),
		}))
		// Ranking by CRM results: won, then volume.
		.sort(
			(a, b) =>
				b.won - a.won ||
				b.leads - a.leads ||
				a.ownerName.localeCompare(b.ownerName, 'es')
		)
}

function buildWeekly(leads: readonly CommercialLeadInput[]): CommercialWeeklyPoint[] {
	const points = new Map<string, CommercialWeeklyPoint>()
	for (const lead of leads) {
		const week = bogotaWeekStart(lead.createdAt)
		const origin = originLabel(lead.originTag, lead.createdAt)
		const key = `${week}|${origin}`
		points.set(key, { week, origin, leads: (points.get(key)?.leads ?? 0) + 1 })
	}
	return [...points.values()].sort(
		(a, b) => a.week.localeCompare(b.week) || a.origin.localeCompare(b.origin, 'es')
	)
}

function buildOrigins(
	input: BuildCommercialReportInput,
	facts: readonly LeadFacts[],
	hasHistory: boolean
): CommercialOriginRow[] {
	const wonKeys: readonly string[] = [STAGE_KEY.WON, STAGE_KEY.CLOSED]
	const wonColumns = new Set(
		input.columns
			.filter((c) => wonKeys.includes(c.externalStatusKey))
			.map((c) => c.idLeadFunnelColumn)
	)
	// First time each lead reached Won/Cierre.
	const wonAt = new Map<number, number>()
	for (const e of input.events) {
		if (!wonColumns.has(e.toColumnId)) continue
		const t = e.occurredAt.getTime()
		wonAt.set(e.idLead, Math.min(wonAt.get(e.idLead) ?? t, t))
	}

	const groups = new Map<string, LeadFacts[]>()
	for (const f of facts) {
		const origin = originLabel(f.lead.originTag, f.lead.createdAt)
		const list = groups.get(origin) ?? []
		list.push(f)
		groups.set(origin, list)
	}

	return [...groups.entries()]
		.map(([origin, list]) => {
			const days = (pick: (f: LeadFacts) => Date | null | undefined) =>
				list.map((f) => daysFromLead(f, pick(f))).filter((d): d is number => d !== null)
			const wonDate = (f: LeadFacts) => {
				// Cierre also receives lost leads: only a won lead has a time to won.
				const t = isWon(f) ? wonAt.get(f.lead.idLead) : undefined
				return t === undefined ? null : new Date(t)
			}
			const fundedValue = (currency: string) =>
				list
					.filter((f) => isFunded(f) && f.business?.currency === currency)
					.reduce((acc, f) => acc + (f.business?.value ?? 0), 0)
			return {
				origin,
				leads: list.length,
				handled: count(list, (f) => f.handled),
				appointments: count(list, (f) => f.appointment),
				attended: count(list, (f) => f.attended),
				proposals: count(list, (f) => f.proposal),
				won: count(list, isWon),
				lost: count(list, (f) => f.lead.outcomeStatus === 'LOST'),
				abandoned: count(list, (f) => f.lead.outcomeStatus === 'ABANDONED'),
				withBusiness: count(list, hasBusiness),
				funded: count(list, isFunded),
				cancelled: count(list, isCancelled),
				avgDaysToWon: hasHistory ? meanOrNull(days(wonDate)) : null,
				avgDaysToBusiness: meanOrNull(days((f) => f.business?.createdAt)),
				avgDaysToFunded: meanOrNull(
					days((f) => (isFunded(f) ? f.business?.dateAnchored : null))
				),
				fundedCop: fundedValue('COP'),
				fundedUsd: fundedValue('USD'),
			}
		})
		.sort((a, b) => b.leads - a.leads || a.origin.localeCompare(b.origin, 'es'))
}

function buildPreviousByOrigin(
	leads: readonly CommercialLeadInput[]
): CommercialOriginPrevious[] {
	const byOrigin = new Map<string, CommercialOriginPrevious>()
	for (const lead of leads) {
		const origin = originLabel(lead.originTag, lead.createdAt)
		const row = byOrigin.get(origin) ?? { origin, leads: 0, won: 0 }
		byOrigin.set(origin, {
			origin,
			leads: row.leads + 1,
			won: row.won + (lead.outcomeStatus === 'WON' ? 1 : 0),
		})
	}
	return [...byOrigin.values()]
}

export function buildCommercialReport(
	input: BuildCommercialReportInput
): CommercialDashboardReport {
	const hasHistory = input.events.length > 0
	const facts = buildFacts(input)
	const kpis = buildKpis(facts, hasHistory)
	const stuck = buildStuck(input)

	return {
		kpis,
		pipelines: input.pipelines ?? [],
		funnel: buildFunnel(kpis),
		msRows: buildMsRows(facts, input.owners, stuck.byOwner, hasHistory),
		stuck: stuck.list,
		stuckTotal: stuck.total,
		unassigned: input.unassigned ?? 0,
		hasStageHistory: hasHistory,
		weekly: buildWeekly(input.leads),
		origins: buildOrigins(input, facts, hasHistory),
		previous: input.previous ?? null,
		previousByOrigin: buildPreviousByOrigin(input.previousLeads ?? []),
	}
}
