import { describe, expect, it } from 'vitest'
import { buildStageStays } from '@/features/leads/lib/build-stage-stays'
import { formatStageDuration } from '@/features/leads/lib/format-stage-duration'

const CREATED_AT = new Date('2026-11-01T20:00:00.000Z')
const MOVED_AT = new Date('2026-11-08T15:30:00.000Z')
const NOW = new Date('2026-11-10T20:43:00.000Z')

describe('buildStageStays', () => {
	it('keeps an open stay in the current column when there is no history', () => {
		const stays = buildStageStays({
			createdAt: CREATED_AT,
			currentColumnName: 'Lead Nuevo',
			events: [],
			now: NOW,
		})

		expect(stays).toEqual([
			{
				columnName: 'Lead Nuevo',
				enteredAt: CREATED_AT,
				leftAt: null,
				durationMs: NOW.getTime() - CREATED_AT.getTime(),
				current: true,
			},
		])
	})

	it('closes each stage at the next change and leaves the last one open', () => {
		const stays = buildStageStays({
			createdAt: CREATED_AT,
			currentColumnName: 'Contacto 1ra Vez',
			now: NOW,
			events: [
				{
					fromColumnName: null,
					toColumnName: 'Lead Nuevo',
					changedAt: CREATED_AT,
				},
				{
					fromColumnName: 'Lead Nuevo',
					toColumnName: 'Contacto 1ra Vez',
					changedAt: MOVED_AT,
				},
			],
		})

		expect(stays).toEqual([
			{
				columnName: 'Lead Nuevo',
				enteredAt: CREATED_AT,
				leftAt: MOVED_AT,
				durationMs: MOVED_AT.getTime() - CREATED_AT.getTime(),
				current: false,
			},
			{
				columnName: 'Contacto 1ra Vez',
				enteredAt: MOVED_AT,
				leftAt: null,
				durationMs: NOW.getTime() - MOVED_AT.getTime(),
				current: true,
			},
		])
	})

	it('prepends the column the lead left when the first change is after creation', () => {
		const stays = buildStageStays({
			createdAt: CREATED_AT,
			currentColumnName: 'Contacto 1ra Vez',
			now: NOW,
			events: [
				{
					fromColumnName: 'Lead Nuevo',
					toColumnName: 'Contacto 1ra Vez',
					changedAt: MOVED_AT,
				},
			],
		})

		expect(stays.map((stay) => stay.columnName)).toEqual([
			'Lead Nuevo',
			'Contacto 1ra Vez',
		])
		expect(stays[0]?.leftAt).toEqual(MOVED_AT)
		expect(stays[1]?.current).toBe(true)
	})
})

describe('formatStageDuration', () => {
	it('formats minutes, hours and days in Spanish', () => {
		expect(formatStageDuration(30_000)).toBe('menos de 1 min')
		expect(formatStageDuration(45 * 60_000)).toBe('45 min')
		expect(formatStageDuration(90 * 60_000)).toBe('1 h 30 min')
		expect(formatStageDuration(7 * 24 * 60 * 60_000)).toBe('7 días')
		expect(formatStageDuration(7 * 24 * 60 * 60_000 + 5 * 60 * 60_000)).toBe(
			'7 días 5 h'
		)
	})
})
