/**
 * One stay in a funnel column, as received by the browser.
 * Duration is derived from consecutive stage changes; it is not stored.
 */
export interface LeadStageStayDto {
	columnName: string
	enteredAt: string
	leftAt: string | null
	durationMs: number
	current: boolean
}
