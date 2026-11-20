import { describe, expect, it } from 'vitest'
import { bogotaLocalDateTimeToIso } from '@/features/leads/tasks/bogota-datetime-input'

describe('bogotaLocalDateTimeToIso', () => {
	it('reads the value as Bogotá time', () => {
		expect(bogotaLocalDateTimeToIso('2026-11-10T09:30')).toBe('2026-11-10T14:30:00.000Z')
	})
	it('keeps late-evening Bogotá times on the right day', () => {
		expect(bogotaLocalDateTimeToIso('2026-11-10T23:00')).toBe('2026-11-11T04:00:00.000Z')
	})
	it.each(['', '2026-11-10', 'abc', '2026-13-40T99:99'])('rejects %j', (value) => {
		expect(bogotaLocalDateTimeToIso(value)).toBeNull()
	})
})
