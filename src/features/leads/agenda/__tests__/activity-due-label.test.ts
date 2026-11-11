import { describe, expect, it } from 'vitest'
import { describeActivityDue } from '@/features/leads/agenda/activity-due-label'

const now = new Date('2026-11-09T15:00:00.000Z')

describe('describeActivityDue', () => {
	it('labels a missing date, an overdue instant, today and a future day', () => {
		expect(describeActivityDue(null, now)).toEqual({ label: 'Sin fecha', overdue: false })
		expect(describeActivityDue('2026-11-08T15:00:00.000Z', now)).toEqual({ label: 'Vencida', overdue: true })
		expect(describeActivityDue('2026-11-09T15:00:00.000Z', now)).toEqual({ label: 'Hoy', overdue: false })
		expect(describeActivityDue('2026-11-10T15:00:00.000Z', now)).toEqual({ label: 'Próxima', overdue: false })
	})
})
