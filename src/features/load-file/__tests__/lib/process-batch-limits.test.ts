import { describe, it, expect } from 'vitest'
import {
	MAX_BATCH_HEADERS,
	MAX_BATCH_RECORDS,
	exceedsProcessBatchLimits,
} from '@/features/load-file/lib/process-batch-limits'

const record = { rowNumber: 1, data: {}, isValid: true, errors: [] }

describe('exceedsProcessBatchLimits', () => {
	it('accepts a batch within the limits', () => {
		expect(
			exceedsProcessBatchLimits({
				records: Array.from({ length: 50 }, () => record),
				headers: ['a', 'b'],
			})
		).toBe(false)
	})

	it('accepts exactly the maximum number of records', () => {
		expect(
			exceedsProcessBatchLimits({
				records: Array.from({ length: MAX_BATCH_RECORDS }, () => record),
				headers: [],
			})
		).toBe(false)
	})

	it('rejects a batch with too many records', () => {
		expect(
			exceedsProcessBatchLimits({
				records: Array.from({ length: MAX_BATCH_RECORDS + 1 }, () => record),
				headers: [],
			})
		).toBe(true)
	})

	it('rejects a batch with too many headers', () => {
		expect(
			exceedsProcessBatchLimits({
				records: [record],
				headers: Array.from({ length: MAX_BATCH_HEADERS + 1 }, () => 'h'),
			})
		).toBe(true)
	})

	it('ignores non-array fields so the service keeps reporting them', () => {
		expect(
			exceedsProcessBatchLimits({ records: undefined, headers: undefined })
		).toBe(false)
	})
})
