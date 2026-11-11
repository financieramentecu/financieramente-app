import { describe, expect, it } from 'vitest'
import { describeTimelineEntry, timelineEntryKey } from '@/features/leads/activities/describe-timeline-entry'

const activity = (type: string, payload: object) => ({
	idLeadActivity: 1,
	type,
	occurredAt: '2026-11-09T15:00:00.000Z',
	actorName: 'Ana',
	payload,
}) as never

describe('describeTimelineEntry', () => {
	it('describes notes', () => {
		expect(describeTimelineEntry(activity('NOTE_ADDED', { note: 'Hola' }))).toEqual({ title: 'Nota de seguimiento', detail: 'Hola', actor: 'Ana' })
	})

	it('describes a logged call with outcome and duration', () => {
		expect(
			describeTimelineEntry(activity('CALL_LOGGED', { summary: 'Interesada', outcome: 'NO_ANSWER', durationMinutes: 5 }))
		).toEqual({ title: 'Llamada registrada', detail: 'Interesada', meta: 'No contestó · 5 min', actor: 'Ana' })
	})

	it.each([
		['MEETING_LOGGED', 'Reunión registrada'],
		['EMAIL_LOGGED', 'Email registrado'],
		['WHATSAPP_LOGGED', 'WhatsApp registrado'],
	])('titles %s', (type, title) => {
		expect(describeTimelineEntry(activity(type, { summary: 's' })).title).toBe(title)
	})

	it('describes conversion, tasks and cases', () => {
		expect(describeTimelineEntry(activity('CONVERTED', { businessId: 77 }))).toMatchObject({ title: 'Lead convertido a negocio', detail: 'Negocio #77' })
		expect(describeTimelineEntry(activity('TASK_CREATED', { taskId: 3, title: 'Llamar' }))).toMatchObject({ title: 'Tarea creada', detail: 'Llamar' })
		expect(describeTimelineEntry(activity('TASK_COMPLETED', { taskId: 3 }))).toMatchObject({ title: 'Tarea completada', detail: 'Tarea #3' })
		expect(describeTimelineEntry(activity('CASE_UPDATED', { caseId: 4, subject: 'Devolución', status: 'RESOLVED' }))).toMatchObject({ title: 'Caso resuelto', detail: 'Devolución · Resuelto' })
		expect(describeTimelineEntry(activity('CASE_UPDATED', { caseId: 4, subject: 'Devolución', status: 'CLOSED' }))).toMatchObject({ title: 'Caso cerrado', detail: 'Devolución · Cerrado' })
		expect(describeTimelineEntry(activity('TASK_COMPLETED', { taskId: 3, title: 'Llamar', comment: 'Contestó' }))).toMatchObject({
			title: 'Tarea completada',
			detail: 'Llamar\nContestó',
		})
		expect(describeTimelineEntry(activity('CASE_UPDATED', { caseId: 4, subject: 'Devolución', status: 'CLOSED', comment: 'Listo' }))).toMatchObject({
			title: 'Caso cerrado',
			detail: 'Devolución · Cerrado\nListo',
		})
	})

	it('describes stage changes with their source', () => {
		expect(
			describeTimelineEntry({
				kind: 'stage_change',
				idLeadStageHistory: 9,
				occurredAt: '2026-11-09T15:00:00.000Z',
				actorName: null,
				fromColumnName: 'Nuevo',
				toColumnName: 'Contactado',
				source: 'CRM_SYNC',
			})
		).toEqual({ title: 'Cambio de etapa', detail: 'Nuevo → Contactado', meta: 'GHL', actor: 'Sistema' })
	})

	it('describes the first stage without an origin', () => {
		expect(
			describeTimelineEntry({
				kind: 'stage_change',
				idLeadStageHistory: 9,
				occurredAt: '2026-11-09T15:00:00.000Z',
				actorName: 'Luis',
				fromColumnName: null,
				toColumnName: 'Nuevo',
				source: 'CSV_IMPORT',
			})
		).toMatchObject({ detail: 'Entró en Nuevo', meta: 'Importación CSV', actor: 'Luis' })
	})
})

describe('timelineEntryKey', () => {
	it('is unique across kinds', () => {
		expect(timelineEntryKey(activity('NOTE_ADDED', { note: 'x' }))).toBe('activity-1')
		expect(timelineEntryKey({ kind: 'stage_change', idLeadStageHistory: 1 } as never)).toBe('stage_change-1')
	})
})
