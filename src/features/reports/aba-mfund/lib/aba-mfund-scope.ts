/**
 * Re-exports viewer-scope intersection from Producción Real.
 * Do not fork BFS / checkbox cascade — route helpers import this.
 */

export {
	intersectUserIdsWithViewerScope,
	type ScopeViewer,
} from '@/features/reports/produccion-real/services/produccion-real-scope.service'
