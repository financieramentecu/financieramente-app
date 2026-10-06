import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	formatDateBogota,
	formatDateTimeBogota,
} from '@/features/shared/lib/format-date'

/** Intl may emit U+00A0 / U+202F between date parts; normalize to a plain space. */
function normalize(value: string): string {
	return value.replace(/[  ]/g, ' ')
}

// 2026-09-30T02:30:00Z is 2026-09-29 21:30 in Bogotá (UTC-5)
const INSTANT_ISO = '2026-09-30T02:30:00Z'
// CLDR versions differ: es-CO "medium" is "29/09/2026" or "29 sept 2026"
const BOGOTA_DATE = /29(\/09\/| sept?\.? )2026/
const BOGOTA_TIME = /9:30\s?p\.\s?m\./

describe('formatDateTimeBogota', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it.each(['UTC', 'Asia/Tokyo'])(
		'shows the Bogota date and time when the runtime timezone is %s',
		timeZone => {
			vi.stubEnv('TZ', timeZone)

			const result = normalize(formatDateTimeBogota(INSTANT_ISO))

			expect(result).toMatch(BOGOTA_DATE)
			expect(result).toMatch(BOGOTA_TIME)
		}
	)

	it('gives the same result for a Date input and for its ISO string', () => {
		expect(formatDateTimeBogota(new Date(INSTANT_ISO))).toBe(
			formatDateTimeBogota(INSTANT_ISO)
		)
	})

	it.each([null, undefined, '', 'not-a-date'])(
		'returns the em dash for empty or invalid input (%j)',
		input => {
			expect(formatDateTimeBogota(input)).toBe('—')
		}
	)
})

describe('formatDateBogota (guard, unchanged behavior)', () => {
	it('derives the Bogota calendar day from a full ISO timestamp', () => {
		expect(formatDateBogota(INSTANT_ISO)).toBe('29/09/2026')
	})

	it('keeps a date-only string on the same calendar day', () => {
		expect(formatDateBogota('2026-09-30')).toBe('30/09/2026')
	})
})
