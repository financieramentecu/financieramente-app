'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { useFlags } from '@flagsmith/flagsmith/react'
import { useSession } from 'next-auth/react'
import { canManageCrm } from '@/features/leads/crm/crm-policy'
import { LeadsBoard } from '@/features/leads/components/leads-board'
import { ActivitiesAgenda } from '@/features/leads/agenda/activities-agenda'
import { LeadsTable } from '@/features/leads/table/leads-table'
import { CrmReports } from '@/features/leads/reports/crm-reports'
import { CrmLeadDetailSheet } from '@/features/leads/components/crm-lead-detail-sheet'
import { useLeadDetailSheet } from '@/features/leads/hooks/use-lead-detail-sheet'
import {
	CRM_TABS,
	parseLeadParam,
	resolveCrmTabs,
	resolveInitialCrmTab,
	type CrmTabId,
} from '@/features/leads/lib/crm-tabs'
import type { FeatureFlag } from '@/features/shared/types/feature-flags.types'
import { CrmHierarchyShell } from '@/features/leads/components/crm-hierarchy-shell'
import type { ActivityFocus } from '@/features/leads/agenda/agenda.types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'

const TAB_FLAGS: FeatureFlag[] = [...CRM_TABS.flatMap((tab) => (tab.flag ? [tab.flag] : [])), 'crm_lead_fields']

export function CrmTabs() {
	const searchParams = useSearchParams()
	const flags = useFlags(TAB_FLAGS)
	const { data: session } = useSession()
	const tabs = resolveCrmTabs((flag: FeatureFlag) => flags[flag]?.enabled ?? false)
	const initialTab = resolveInitialCrmTab(searchParams.get('tab'), tabs)
	const [selectedTab, setSelectedTab] = React.useState<CrmTabId | null>(null)
	const [visitedTabs, setVisitedTabs] = React.useState<CrmTabId[]>([])
	const activeTab = selectedTab ?? initialTab
	if (!visitedTabs.includes(activeTab)) {
		setVisitedTabs((current) =>
			current.includes(activeTab) ? current : [...current, activeTab]
		)
	}
	const sheet = useLeadDetailSheet()
	const [activityFocus, setActivityFocus] = React.useState<ActivityFocus | null>(null)
	const deepLinkLead = parseLeadParam(searchParams.get('lead'))
	const { openLead } = sheet

	React.useEffect(() => {
		if (deepLinkLead) void openLead(deepLinkLead)
		// Only react to the URL value; openLead is recreated each render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [deepLinkLead])

	return (
		<CrmHierarchyShell>
			<Tabs value={activeTab} onValueChange={(value) => setSelectedTab(value as CrmTabId)} className="space-y-4">
				<TabsList>
					{tabs.map((tab) => (
						<TabsTrigger key={tab.id} value={tab.id} disabled={!tab.enabled}>
							{tab.label}
							{!tab.enabled && <span className="ml-1 text-xs text-muted-foreground">Próximamente</span>}
						</TabsTrigger>
					))}
				</TabsList>
				<TabsContent value="pipeline" forceMount hidden={activeTab !== 'pipeline'}>
					{visitedTabs.includes('pipeline') && <LeadsBoard />}
				</TabsContent>
				<TabsContent value="leads" forceMount hidden={activeTab !== 'leads'}>
					{visitedTabs.includes('leads') && (
						<LeadsTable
							onOpenLead={(idLead) => void openLead(idLead)}
							fieldsEnabled={flags.crm_lead_fields?.enabled ?? false}
							canConfigure={canManageCrm(session?.user?.role)}
						/>
					)}
				</TabsContent>
				<TabsContent value="activities" forceMount hidden={activeTab !== 'activities'}>
					{visitedTabs.includes('activities') && (
						<ActivitiesAgenda
							onOpenLead={(idLead) => void openLead(idLead)}
							focus={activityFocus}
						/>
					)}
				</TabsContent>
				<TabsContent value="reports" forceMount hidden={activeTab !== 'reports'}>
					{visitedTabs.includes('reports') && <CrmReports />}
				</TabsContent>
			</Tabs>
			<CrmLeadDetailSheet
				lead={sheet.lead}
				open={sheet.open}
				onOpenChange={sheet.setOpen}
				onViewActivity={(focus) => {
					setActivityFocus(focus)
					setSelectedTab('activities')
					sheet.setOpen(false)
				}}
			/>
		</CrmHierarchyShell>
	)
}
