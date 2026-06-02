import type { DashboardAppliedFilters, DashboardFilterDraft } from '../types/dashboard-filter.types'

export function isDraftEqualToApplied(
  draft: DashboardFilterDraft,
  applied: DashboardAppliedFilters
): boolean {
  if (
    draft.dateRange.start.getTime() !== applied.dateRange.start.getTime() ||
    draft.dateRange.end.getTime() !== applied.dateRange.end.getTime()
  ) return false

  if (draft.isInternacional !== applied.isInternacional) return false

  const eq = (a: readonly (string | number)[], b: readonly (string | number)[]) =>
    a.length === b.length && a.every((v, i) => v === b[i])

  return (
    eq(draft.statuses, applied.statuses) &&
    eq(draft.categoryIds, applied.categoryIds) &&
    eq(draft.companyIds, applied.companyIds) &&
    eq(draft.productIds, applied.productIds) &&
    eq(draft.originIds, applied.originIds) &&
    eq(draft.plazos, applied.plazos) &&
    eq(draft.periodicidades, applied.periodicidades)
  )
}
