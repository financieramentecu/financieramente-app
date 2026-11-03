import type { CommercialDashboardReport } from '../types/commercial-dashboard.types'

export const EMPTY_COMMERCIAL_DASHBOARD_REPORT: CommercialDashboardReport = {
	kpis: {
		newLeads: 0,
		handled: 0,
		contacted: 0,
		contactedWithinHour: null,
		contactTimed: 0,
		appointments: 0,
		attended: 0,
		noShow: 0,
		proposals: 0,
		won: 0,
		withBusiness: 0,
		funded: 0,
	},
	pipelines: [],
	funnel: [],
	msRows: [],
	stuck: [],
	stuckTotal: 0,
	unassigned: 0,
	hasStageHistory: false,
	weekly: [],
	origins: [],
	previous: null,
	previousByOrigin: [],
}
