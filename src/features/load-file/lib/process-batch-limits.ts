/**
 * Server-side caps for a process-batch request. The browser sends 50 records
 * per batch; the cap leaves headroom while bounding the work and memory one
 * request can demand.
 */
export const MAX_BATCH_RECORDS = 500
export const MAX_BATCH_HEADERS = 200

interface BatchShape {
	records?: unknown
	headers?: unknown
}

export function exceedsProcessBatchLimits({
	records,
	headers,
}: BatchShape): boolean {
	if (Array.isArray(records) && records.length > MAX_BATCH_RECORDS) return true
	if (Array.isArray(headers) && headers.length > MAX_BATCH_HEADERS) return true
	return false
}
