export interface CrmStageCount {
  readonly idLeadFunnelColumn: number
  readonly count: number
}

/** Aggregate-only CRM reporting: never include identity/contact fields. */
export interface CrmSummary {
  readonly opportunities: number
  readonly stageCounts: readonly CrmStageCount[]
  readonly openTasks: number
  readonly overdueTasks: number
  readonly openCases: number
  readonly overdueCases: number
}

export const EMPTY_CRM_SUMMARY: CrmSummary = {
  opportunities: 0,
  stageCounts: [],
  openTasks: 0,
  overdueTasks: 0,
  openCases: 0,
  overdueCases: 0,
}
