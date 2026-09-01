import { describe, expect, it } from 'vitest'
import { intersectUserIdsWithViewerScope as fromProduccionReal } from '@/features/reports/produccion-real/services/produccion-real-scope.service'
import { intersectUserIdsWithViewerScope as fromAbaMfund } from '../lib/aba-mfund-scope'

describe('ABA-MFUND scope reuse', () => {
	it('re-exports intersectUserIdsWithViewerScope without forking BFS', () => {
		expect(fromAbaMfund).toBe(fromProduccionReal)
	})
})
