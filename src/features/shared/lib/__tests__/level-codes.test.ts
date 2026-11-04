import { describe, it, expect } from 'vitest'
import {
	PARTNER_EXTERNAL_LEVEL_CODE,
	PARTNER_LEADER_LEVEL_CODES,
	isDistributionExcludedLevel,
	isPartnerLeaderLevel,
	excludePartnerExternalLevel,
} from '../level-codes'

describe('level-codes', () => {
	it('exposes the PARTNER_EXTERNAL level code', () => {
		expect(PARTNER_EXTERNAL_LEVEL_CODE).toBe('PARTNER_EXTERNAL')
	})

	it('lists LEVEL_1..LEVEL_5 (in order) as valid partner leader levels', () => {
		expect(PARTNER_LEADER_LEVEL_CODES).toEqual([
			'LEVEL_1',
			'LEVEL_2',
			'LEVEL_3',
			'LEVEL_4',
			'LEVEL_5',
		])
	})

	it('never lists PARTNER_EXTERNAL, LEVEL_0 or GENERAL_LEVEL as leader levels', () => {
		expect(PARTNER_LEADER_LEVEL_CODES).not.toContain('PARTNER_EXTERNAL')
		expect(PARTNER_LEADER_LEVEL_CODES).not.toContain('LEVEL_0')
		expect(PARTNER_LEADER_LEVEL_CODES).not.toContain('GENERAL_LEVEL')
	})

	describe('isDistributionExcludedLevel', () => {
		it('is true for PARTNER_EXTERNAL', () => {
			expect(isDistributionExcludedLevel('PARTNER_EXTERNAL')).toBe(true)
		})

		it.each(['LEVEL_0', 'LEVEL_5', 'GENERAL_LEVEL', 'partner_external', ''])(
			'is false for %j',
			(code) => {
				expect(isDistributionExcludedLevel(code)).toBe(false)
			}
		)

		it.each([null, undefined])('is false for %s', (code) => {
			expect(isDistributionExcludedLevel(code)).toBe(false)
		})
	})

	describe('isPartnerLeaderLevel', () => {
		it.each(['LEVEL_1', 'LEVEL_5'])('is true for %s', (code) => {
			expect(isPartnerLeaderLevel(code)).toBe(true)
		})

		it.each(['LEVEL_0', 'PARTNER_EXTERNAL', 'GENERAL_LEVEL', null, undefined])(
			'is false for %s',
			(code) => {
				expect(isPartnerLeaderLevel(code)).toBe(false)
			}
		)
	})
})

describe('excludePartnerExternalLevel', () => {
	const levels = [
		{ code: 'LEVEL_0', name: 'MS Junior' },
		{ code: 'PARTNER_EXTERNAL', name: 'Partner Externo' },
		{ code: 'LEVEL_5', name: 'Partner' },
	]

	it('removes PARTNER_EXTERNAL and keeps every other level in order', () => {
		expect(excludePartnerExternalLevel(levels).map((l) => l.code)).toEqual([
			'LEVEL_0',
			'LEVEL_5',
		])
	})

	it('returns an equal list when PARTNER_EXTERNAL is absent', () => {
		const withoutPartner = levels.filter((l) => l.code !== 'PARTNER_EXTERNAL')
		expect(excludePartnerExternalLevel(withoutPartner)).toEqual(withoutPartner)
	})

	it('does not mutate the input', () => {
		const input = [...levels]
		excludePartnerExternalLevel(input)
		expect(input).toEqual(levels)
	})
})
