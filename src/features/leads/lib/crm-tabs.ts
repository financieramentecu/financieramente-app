import type { FeatureFlag } from '@/features/shared/types/feature-flags.types'

export const CRM_TAB_IDS = ['pipeline', 'leads', 'activities', 'reports'] as const

export type CrmTabId = (typeof CRM_TAB_IDS)[number]

export interface CrmTabDefinition {
	readonly id: CrmTabId
	readonly label: string
	/** URL value for `?tab=` (Spanish, user-facing). */
	readonly slug: string
	readonly enabled: boolean
	/** When set, the tab is enabled only while this flag is on. */
	readonly flag?: FeatureFlag
}

/**
 * CRM page tabs. Disabled tabs are planned for later CRM phases
 * (see PRDs/crm/PLAN-DE-TRABAJO-CRM.md) and render as "coming soon".
 */
export const CRM_TABS: readonly CrmTabDefinition[] = [
	{ id: 'pipeline', label: 'Pipeline', slug: 'pipeline', enabled: true },
	{ id: 'leads', label: 'Leads', slug: 'leads', enabled: true, flag: 'crm_lead_table' },
	{ id: 'activities', label: 'Actividades', slug: 'actividades', enabled: true, flag: 'crm_tasks' },
	{ id: 'reports', label: 'Reportes', slug: 'reportes', enabled: false },
]

export const DEFAULT_CRM_TAB: CrmTabId = 'pipeline'

/** Tabs with `enabled` resolved against the viewer's feature flags. */
export function resolveCrmTabs(isFlagOn: (flag: FeatureFlag) => boolean): CrmTabDefinition[] {
	return CRM_TABS.map((tab) => ({ ...tab, enabled: tab.enabled && (!tab.flag || isFlagOn(tab.flag)) }))
}

/** Tab selected by `?tab=`, falling back to the default when unknown or disabled. */
export function resolveInitialCrmTab(slug: string | null, tabs: readonly CrmTabDefinition[]): CrmTabId {
	const match = tabs.find((tab) => tab.slug === slug && tab.enabled)
	return match?.id ?? DEFAULT_CRM_TAB
}

/** `?lead=` as a positive integer, else null. */
export function parseLeadParam(value: string | null): number | null {
	const parsed = Number.parseInt(value ?? '', 10)
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}
