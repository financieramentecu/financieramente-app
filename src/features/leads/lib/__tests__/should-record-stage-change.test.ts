import { describe, it, expect } from 'vitest'
import { shouldRecordStageChange } from '@/features/leads/lib/should-record-stage-change'

describe('shouldRecordStageChange', () => {
	it('records the first stage of a new lead (no previous column)', () => {
		expect(shouldRecordStageChange(undefined, 5)).toBe(true)
		expect(shouldRecordStageChange(null, 5)).toBe(true)
	})

	it('records a move to a different column', () => {
		expect(shouldRecordStageChange(1, 5)).toBe(true)
	})

	it('skips when the column is unchanged', () => {
		expect(shouldRecordStageChange(5, 5)).toBe(false)
	})
})
