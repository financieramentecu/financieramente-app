/**
 * Returns true when the date range is valid (start ≤ end, day precision).
 */
export function isDateRangeValid(start: Date, end: Date): boolean {
  return start.getTime() <= end.getTime()
}
