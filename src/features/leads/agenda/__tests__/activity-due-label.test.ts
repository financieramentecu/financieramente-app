import { describe, expect, it } from 'vitest'
import { activityDueCardText, describeActivityDue, isActivityOverdue } from '@/features/leads/agenda/activity-due-label'

const now = new Date('2026-11-09T15:00:00.000Z')

describe('describeActivityDue', () => {
	it('labels a missing date, an overdue instant, today and a future day', () => {
		expect(describeActivityDue(null, now)).toEqual({ label: 'Sin fecha', overdue: false })
		expect(describeActivityDue('2026-11-08T15:00:00.000Z', now)).toEqual({ label: 'Vencida', overdue: true })
		expect(describeActivityDue('2026-11-09T15:00:00.000Z', now)).toEqual({ label: 'Hoy', overdue: false })
		expect(describeActivityDue('2026-11-10T15:00:00.000Z', now)).toEqual({ label: 'Próxima', overdue: false })
	})

	it('keeps the Bogotá due time as the card label', () => {
		expect(activityDueCardText(null, 'Vence')).toBe('Sin fecha límite')
		expect(activityDueCardText('2026-11-08T15:00:00.000Z', 'Vence')).toMatch(/^Vence: .+10:00/)
		expect(activityDueCardText('2026-11-09T15:00:00.000Z', 'SLA')).toMatch(/^SLA: .+10:00/)
		expect(isActivityOverdue('2026-11-08T15:00:00.000Z', now, false)).toBe(true)
		expect(isActivityOverdue('2026-11-08T15:00:00.000Z', now, true)).toBe(false)
	})
})
