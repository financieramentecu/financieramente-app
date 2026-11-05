export const CRM_TAB_IDS = ['pipeline', 'leads', 'activities', 'reports'] as const

export type CrmTabId = (typeof CRM_TAB_IDS)[number]

export interface CrmTabDefinition {
	readonly id: CrmTabId
	readonly label: string
	readonly enabled: boolean
}

/**
 * CRM page tabs. Disabled tabs are planned for later CRM phases
 * (see PRDs/crm/PLAN-DE-TRABAJO-CRM.md) and render as "coming soon".
 */
export const CRM_TABS: readonly CrmTabDefinition[] = [
	{ id: 'pipeline', label: 'Pipeline', enabled: true },
	{ id: 'leads', label: 'Leads', enabled: false },
	{ id: 'activities', label: 'Actividades', enabled: false },
	{ id: 'reports', label: 'Reportes', enabled: false },
]

export const DEFAULT_CRM_TAB: CrmTabId = 'pipeline'
