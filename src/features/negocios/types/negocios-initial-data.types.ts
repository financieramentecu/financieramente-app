import type { BusinessListResponse, CoachKpiResponse } from './business-api.types'

/**
 * Data the negocios Server Component loads for the first render.
 * A null part could not be loaded on the server; the client fetches it.
 */
export interface NegociosInitialData {
	list: BusinessListResponse | null
	stats: CoachKpiResponse | null
	/** Unique id of the server render that produced this data. */
	renderId: string
}
