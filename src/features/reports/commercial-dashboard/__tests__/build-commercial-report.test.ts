import { describe, expect, it } from 'vitest'
import { buildCommercialReport } from '../lib/build-commercial-report'
import type {
	CommercialColumnInput,
	CommercialLeadInput,
} from '../types/commercial-dashboard.types'

const NOW = new Date('2026-10-27T12:00:00Z')

const COLUMNS: CommercialColumnInput[] = [
	{ idLeadFunnelColumn: 1, name: 'Lead Nuevo', externalStatusKey: 'NUEVO_LEAD', position: 1 },
	{ idLeadFunnelColumn: 2, name: 'Contacto 1ra Vez', externalStatusKey: 'PRIMER_CONTACTO', position: 2 },
	{ idLeadFunnelColumn: 7, name: 'Diagnostico Agendado', externalStatusKey: 'DIAGNOSTICO_AGENDADO', position: 7 },
	{ idLeadFunnelColumn: 8, name: 'Asistió', externalStatusKey: 'ASISTIO_AL_DIAGNOSTICO', position: 8 },
	{ idLeadFunnelColumn: 9, name: 'No asistió', externalStatusKey: 'NO_ASISTIO_AL_DIAGNOSTICO', position: 9 },
	{ idLeadFunnelColumn: 11, name: 'Pendiente Tareas', externalStatusKey: 'PENDIENTE_TAREAS', position: 11 },
	{ idLeadFunnelColumn: 12, name: 'En acompañamiento', externalStatusKey: 'EN_ACOMPANAMIENTO', position: 12 },
	{ idLeadFunnelColumn: 13, name: 'Estructurando propuesta', externalStatusKey: 'ESTRUCTURANDO_PROPUESTA', position: 13 },
	{ idLeadFunnelColumn: 21, name: 'Cierre', externalStatusKey: 'CIERRE', position: 21 },
	{ idLeadFunnelColumn: 22, name: 'Won', externalStatusKey: 'WON', position: 22 },
]

function lead(
	idLead: number,
	idLeadFunnelColumn: number,
	overrides: Partial<CommercialLeadInput> = {}
): CommercialLeadInput {
	return {
		idLead,
		idUser: 10,
		createdAt: new Date('2026-10-20T10:00:00Z'),
		outcomeStatus: 'OPEN',
		idLeadFunnelColumn,
		...overrides,
	}
}

const base = {
	columns: COLUMNS,
	owners: [{ idUser: 10, name: 'Daniela R.' }],
	stuckCandidates: [],
	now: NOW,
}

describe('buildCommercialReport', () => {
	it('returns zeros and no history for an empty cohort', () => {
		const report = buildCommercialReport({ ...base, leads: [], events: [] })
		expect(report.kpis.newLeads).toBe(0)
		expect(report.hasStageHistory).toBe(false)
		expect(report.kpis.contactedWithinHour).toBeNull()
	})

	it('counts stages reached from the current column when there is no history', () => {
		const report = buildCommercialReport({
			...base,
			leads: [lead(1, 1), lead(2, 2), lead(3, 7), lead(4, 8)],
			events: [],
		})
		expect(report.kpis.newLeads).toBe(4)
		expect(report.kpis.contacted).toBe(3)
		expect(report.kpis.appointments).toBe(2)
		expect(report.kpis.attended).toBe(1)
		expect(report.kpis.contactedWithinHour).toBeNull()
	})

	it('measures first contact within one hour from stage events', () => {
		const report = buildCommercialReport({
			...base,
			leads: [lead(1, 2), lead(2, 2)],
			events: [
				{ idLead: 1, toColumnId: 2, occurredAt: new Date('2026-10-20T10:30:00Z') },
				{ idLead: 2, toColumnId: 2, occurredAt: new Date('2026-10-20T14:00:00Z') },
			],
		})
		expect(report.hasStageHistory).toBe(true)
		expect(report.kpis.contactedWithinHour).toBe(1)
	})

	it('counts attendance for leads that already moved past the diagnostic', () => {
		const report = buildCommercialReport({
			...base,
			leads: [lead(1, 8), lead(2, 11), lead(3, 9)],
			events: [],
		})
		expect(report.kpis.attended).toBe(2)
		expect(report.kpis.noShow).toBe(1)
	})

	it('counts handled leads (left Lead nuevo) and no-shows apart', () => {
		const report = buildCommercialReport({
			...base,
			leads: [lead(1, 1), lead(2, 8), lead(3, 9), lead(4, 22)],
			events: [],
		})
		expect(report.kpis.handled).toBe(3)
		expect(report.kpis.noShow).toBe(1)
		expect(report.msRows[0]).toMatchObject({ leads: 4, handled: 3 })
	})

	it('does not count lost or abandoned leads in Cierre as having reached earlier stages', () => {
		const report = buildCommercialReport({
			...base,
			leads: [
				lead(1, 21, { outcomeStatus: 'LOST' }),
				lead(2, 21, { outcomeStatus: 'ABANDONED' }),
				lead(3, 21, { outcomeStatus: 'WON' }),
				lead(4, 21),
			],
			events: [],
		})
		expect(report.kpis).toMatchObject({ handled: 4, appointments: 2, attended: 2, proposals: 2 })
	})

	it('keeps the stages a lost lead in Cierre actually went through', () => {
		const report = buildCommercialReport({
			...base,
			leads: [lead(1, 21, { outcomeStatus: 'LOST' })],
			events: [{ idLead: 1, toColumnId: 7, occurredAt: new Date('2026-10-21T10:00:00Z') }],
		})
		expect(report.kpis).toMatchObject({ appointments: 1, attended: 0, proposals: 0 })
	})

	it('averages days to won over won leads only and counts abandoned apart from lost', () => {
		const report = buildCommercialReport({
			...base,
			leads: [
				lead(1, 21, { outcomeStatus: 'WON', originTag: 'Propios' }),
				lead(2, 21, { outcomeStatus: 'LOST', originTag: 'Propios' }),
				lead(3, 21, { outcomeStatus: 'ABANDONED', originTag: 'Propios' }),
			],
			events: [
				{ idLead: 1, toColumnId: 21, occurredAt: new Date('2026-10-22T10:00:00Z') },
				{ idLead: 2, toColumnId: 21, occurredAt: new Date('2026-11-19T10:00:00Z') },
			],
		})
		expect(report.origins[0]).toMatchObject({ won: 1, lost: 1, abandoned: 1, avgDaysToWon: 2 })
	})

	it('ranks Money Strategists by won leads, then volume', () => {
		const report = buildCommercialReport({
			...base,
			owners: [
				{ idUser: 10, name: 'Daniela R.' },
				{ idUser: 11, name: 'Olga R.' },
			],
			leads: [
				lead(1, 1),
				lead(2, 1),
				lead(3, 21, { idUser: 11, outcomeStatus: 'WON' }),
			],
			events: [],
		})
		expect(report.msRows.map((row) => row.ownerName)).toEqual(['Olga R.', 'Daniela R.'])
	})

	it('lists only open leads idle for 7+ days, oldest first, skipping final and follow-up stages', () => {
		const report = buildCommercialReport({
			...base,
			leads: [],
			events: [],
			stuckCandidates: [
				{ idLead: 1, idUser: 10, name: 'Ana', idLeadFunnelColumn: 2, updatedAt: new Date('2026-10-10T00:00:00Z') },
				{ idLead: 2, idUser: 10, name: 'Beto', idLeadFunnelColumn: 2, updatedAt: new Date('2026-10-26T00:00:00Z') },
				{ idLead: 3, idUser: 10, name: 'Caro', idLeadFunnelColumn: 22, updatedAt: new Date('2026-09-01T00:00:00Z') },
				{ idLead: 4, idUser: 10, name: 'Dani', idLeadFunnelColumn: 12, updatedAt: new Date('2026-09-01T00:00:00Z') },
			],
		})
		expect(report.stuckTotal).toBe(1)
		expect(report.stuck[0]).toMatchObject({ name: 'Ana', stageName: 'Contacto 1ra Vez', daysStuck: 17 })
		expect(report.msRows[0]).toMatchObject({ idUser: 10, stuck: 1 })
	})
})
