/**
 * Empty payload when the viewer has no hierarchy scope or no matching leads.
 */

import type { LeadsAnalyticsReport } from '../types/leads-analytics.types'

export const EMPTY_LEADS_ANALYTICS_REPORT: LeadsAnalyticsReport = {
	followUpBars: [],
	converted: { total: 0, slices: [] },
	heatmap: { columns: [], rows: [], maxCellCount: 0 },
}
