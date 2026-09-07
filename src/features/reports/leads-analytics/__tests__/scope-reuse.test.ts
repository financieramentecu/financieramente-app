import { describe, expect, it } from 'vitest'
import { intersectUserIdsWithViewerScope as fromProduccionReal } from '@/features/reports/produccion-real/services/produccion-real-scope.service'
import { intersectUserIdsWithViewerScope as fromLeadsAnalytics } from '../lib/leads-analytics-scope'

describe('Leads Analytics scope reuse', () => {
	it('re-exports intersectUserIdsWithViewerScope without forking BFS', () => {
		expect(fromLeadsAnalytics).toBe(fromProduccionReal)
	})
})
