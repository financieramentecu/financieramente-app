'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { useFlags } from '@flagsmith/flagsmith/react'
import { LeadsBoard } from '@/features/leads/components/leads-board'
import { ActivitiesAgenda } from '@/features/leads/agenda/activities-agenda'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/shared/ui/tabs'

const TAB_FLAGS = CRM_TABS.flatMap((tab) => (tab.flag ? [tab.flag] : []))

export function CrmTabs() {
	const searchParams = useSearchParams()
	const flags = useFlags(TAB_FLAGS)
	const tabs = resolveCrmTabs((flag: FeatureFlag) => flags[flag]?.enabled ?? false)
	const initialTab = resolveInitialCrmTab(searchParams.get('tab'), tabs)
	const [selectedTab, setSelectedTab] = React.useState<CrmTabId | null>(null)
	const activeTab = selectedTab ?? initialTab
	const sheet = useLeadDetailSheet()
	const deepLinkLead = parseLeadParam(searchParams.get('lead'))
	const { openLead } = sheet

	React.useEffect(() => {
		if (deepLinkLead) void openLead(deepLinkLead)
		// Only react to the URL value; openLead is recreated each render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [deepLinkLead])

	return (
		<>
			<Tabs value={activeTab} onValueChange={(value) => setSelectedTab(value as CrmTabId)} className="space-y-4">
				<TabsList>
					{tabs.map((tab) => (
						<TabsTrigger key={tab.id} value={tab.id} disabled={!tab.enabled}>
							{tab.label}
							{!tab.enabled && <span className="ml-1 text-xs text-muted-foreground">Próximamente</span>}
						</TabsTrigger>
					))}
				</TabsList>
				<TabsContent value="pipeline">
					<LeadsBoard />
				</TabsContent>
				<TabsContent value="activities">
					{activeTab === 'activities' && <ActivitiesAgenda onOpenLead={(idLead) => void openLead(idLead)} />}
				</TabsContent>
			</Tabs>
			<CrmLeadDetailSheet lead={sheet.lead} open={sheet.open} onOpenChange={sheet.setOpen} />
		</>
	)
}
