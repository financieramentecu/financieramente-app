/**
 * A stage transition is recorded when the lead has no previous column
 * (first stage of a new lead) or moves to a different column.
 */
export function shouldRecordStageChange(
	previousColumnId: number | null | undefined,
	nextColumnId: number
): boolean {
	return previousColumnId == null || previousColumnId !== nextColumnId
}
