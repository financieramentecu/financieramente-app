import { describe, expect, it } from 'vitest'
import { buildCommercialReport } from '../lib/build-commercial-report'
import { buildPeriodTotals } from '../lib/build-commercial-report'
import { formatChange } from '../lib/format'
import { bogotaWeekStart, originLabel } from '../lib/origin-label'
import { previousRange } from '../lib/previous-range'
import type {
	CommercialColumnInput,
	CommercialLeadInput,
} from '../types/commercial-dashboard.types'

const COLUMNS: CommercialColumnInput[] = [
	{ idLeadFunnelColumn: 1, name: 'Lead Nuevo', externalStatusKey: 'NUEVO_LEAD', position: 1 },
	{ idLeadFunnelColumn: 7, name: 'Diagnostico Agendado', externalStatusKey: 'DIAGNOSTICO_AGENDADO', position: 7 },
	{ idLeadFunnelColumn: 22, name: 'Won', externalStatusKey: 'WON', position: 22 },
]

function lead(idLead: number, overrides: Partial<CommercialLeadInput>): CommercialLeadInput {
	return {
		idLead,
		idUser: 10,
		createdAt: new Date('2026-10-20T15:00:00Z'),
		outcomeStatus: 'OPEN',
		idLeadFunnelColumn: 1,
		...overrides,
	}
}

describe('originLabel', () => {
	it('splits the Money Flow pipeline at the Money Flow 3 launch (7 Sep 2026, Bogotá)', () => {
		expect(originLabel('Money Flow- Skool', new Date('2026-09-07T05:00:00Z'))).toBe('Money Flow 3')
		expect(originLabel('Money Flow- Skool', new Date('2026-09-07T04:59:00Z'))).toBe('Money Flow 2 o anterior')
		expect(originLabel('Money Map', new Date('2026-09-01T00:00:00Z'))).toBe('Money Map')
		expect(originLabel(null, new Date())).toBe('Sin pipeline')
	})
})

describe('bogotaWeekStart', () => {
	it('returns the Bogotá Monday, also for a Monday-night UTC timestamp still on Sunday in Bogotá', () => {
		expect(bogotaWeekStart(new Date('2026-10-22T15:00:00Z'))).toBe('2026-10-19')
		expect(bogotaWeekStart(new Date('2026-10-26T03:00:00Z'))).toBe('2026-10-19')
		expect(bogotaWeekStart(new Date('2026-10-26T05:00:00Z'))).toBe('2026-10-26')
	})
})

describe('previous period', () => {
	it('takes the same number of days right before the range', () => {
		expect(previousRange({ dateFrom: '2026-10-01', dateTo: '2026-10-31' })).toEqual({
			dateFrom: '2026-08-31',
			dateTo: '2026-09-30',
		})
		expect(previousRange({ dateFrom: '2026-11-03', dateTo: '2026-11-03' })).toEqual({
			dateFrom: '2026-11-02',
			dateTo: '2026-11-02',
		})
	})

	it('totals won, linked and funded leads, and formats the change', () => {
		const totals = buildPeriodTotals(
			{ dateFrom: '2026-09-01', dateTo: '2026-09-30' },
			[
				lead(1, { outcomeStatus: 'WON', idBusiness: 5 }),
				lead(2, { idBusiness: 6 }),
				lead(3, {}),
			],
			[
				{ idBusiness: 5, status: 'FONDEADO' },
				{ idBusiness: 6, status: 'EMITIDO' },
			]
		)
		expect(totals).toMatchObject({ newLeads: 3, won: 1, withBusiness: 2, funded: 1 })
		expect(formatChange(4, 3)).toBe('+33%')
		expect(formatChange(2, 4)).toBe('−50%')
		expect(formatChange(1, 0)).toBeNull()
	})
})

describe('buildCommercialReport — previous period by origin', () => {
	it('counts previous leads and won per origin, with Money Flow split by launch', () => {
		const report = buildCommercialReport({
			columns: COLUMNS,
			owners: [],
			stuckCandidates: [],
			now: new Date('2026-10-30T12:00:00Z'),
			leads: [],
			events: [],
			previousLeads: [
				lead(1, { originTag: 'Money Map', outcomeStatus: 'WON' }),
				lead(2, { originTag: 'Money Map' }),
				lead(3, { originTag: 'Money Flow- Skool', createdAt: new Date('2026-08-20T15:00:00Z') }),
			],
		})
		expect(report.previousByOrigin).toEqual([
			{ origin: 'Money Map', leads: 2, won: 1 },
			{ origin: 'Money Flow 2 o anterior', leads: 1, won: 0 },
		])
	})
})

describe('buildCommercialReport — origins', () => {
	it('counts conversion per origin, business status and days to won', () => {
		const report = buildCommercialReport({
			columns: COLUMNS,
			owners: [],
			stuckCandidates: [],
			now: new Date('2026-10-30T12:00:00Z'),
			leads: [
				lead(1, { originTag: 'Money Map', outcomeStatus: 'WON', idLeadFunnelColumn: 22, idBusiness: 100 }),
				lead(2, { originTag: 'Money Map', idBusiness: 101 }),
				lead(3, { originTag: 'Money Map', outcomeStatus: 'LOST' }),
				lead(4, { originTag: 'Propios', idLeadFunnelColumn: 7 }),
			],
			events: [
				{ idLead: 1, toColumnId: 22, occurredAt: new Date('2026-10-24T15:00:00Z') },
			],
			businesses: [
				{
					idBusiness: 100,
					status: 'FONDEADO',
					createdAt: new Date('2026-10-26T15:00:00Z'),
					dateAnchored: new Date('2026-10-30T15:00:00Z'),
					value: 500000,
					currency: 'COP',
				},
				{ idBusiness: 101, status: 'CANCELADO', createdAt: new Date('2026-10-22T15:00:00Z') },
			],
		})

		expect(report.origins.map((r) => r.origin)).toEqual(['Money Map', 'Propios'])
		expect(report.origins[0]).toMatchObject({
			leads: 3,
			won: 1,
			lost: 1,
			withBusiness: 2,
			funded: 1,
			cancelled: 1,
			avgDaysToWon: 4,
			// (6 + 2) / 2 days to business; 10 days to funding; only funded value counts.
			avgDaysToBusiness: 4,
			avgDaysToFunded: 10,
			fundedCop: 500000,
			fundedUsd: 0,
		})
		expect(report.kpis).toMatchObject({ won: 1, withBusiness: 2, funded: 1 })
		expect(report.previousByOrigin).toEqual([])
		expect(report.msRows[0]).toMatchObject({ won: 1, withBusiness: 2, funded: 1, cancelled: 1 })
		expect(report.origins[1]).toMatchObject({ leads: 1, appointments: 1, avgDaysToWon: null })
		expect(report.weekly).toEqual([
			{ week: '2026-10-19', origin: 'Money Map', leads: 3 },
			{ week: '2026-10-19', origin: 'Propios', leads: 1 },
		])
	})
})
